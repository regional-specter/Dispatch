from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib

from dispatch.features.delay import DELAY_FEATURE_COLUMNS, build_delay_features_row, features_to_matrix

DEFAULT_THRESHOLD = 0.5


class DelayPredictor:
    def __init__(self, model_dir: Path | str) -> None:
        self.model_dir = Path(model_dir)
        self.classifier = joblib.load(self.model_dir / "delay_classifier.pkl")
        self.regressor = joblib.load(self.model_dir / "delay_regressor.pkl")
        meta_path = self.model_dir / "delay.meta.json"
        self.meta: dict[str, Any] = json.loads(meta_path.read_text()) if meta_path.exists() else {}

    def predict(self, flight: dict[str, Any]) -> dict[str, Any]:
        features = build_delay_features_row(
            month=int(flight["month"]),
            day_of_month=int(flight["day_of_month"]),
            day_of_week=int(flight["day_of_week"]),
            crs_dep_time=int(flight["crs_dep_time"]),
            distance=float(flight["distance"]),
            crs_elapsed_time=float(flight["crs_elapsed_time"]),
            carrier_delay_risk=float(flight.get("carrier_delay_risk", 0.2)),
            route_delay_risk=float(flight.get("route_delay_risk", 0.2)),
        )
        matrix = features_to_matrix(features)
        delay_prob = float(self.classifier.predict_proba(matrix)[0, 1])
        delay_minutes = float(max(0.0, self.regressor.predict(matrix)[0]))
        return {
            "delay_probability": round(delay_prob, 4),
            "is_delayed": delay_prob >= DEFAULT_THRESHOLD,
            "predicted_delay_minutes": round(delay_minutes, 1),
            "confidence": round(max(delay_prob, 1 - delay_prob), 4),
            "features": {k: round(float(v), 4) for k, v in features.items()},
        }

    def model_info(self) -> dict[str, Any]:
        return {
            "name": "flight_delay",
            "display_name": "Flight Disruption & Delay Predictor",
            "architecture": "Two-stage LightGBM (classifier + regressor)",
            "features": DELAY_FEATURE_COLUMNS,
            "metrics": self.meta.get("metrics", {}),
            "notebook_url": self.meta.get("notebook_url", "notebooks/flight-disruption-delay-predictor.ipynb"),
            "dataset": self.meta.get("dataset", "BTS Flight Delay 2024 (demo subset)"),
        }
