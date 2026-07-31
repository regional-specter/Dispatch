from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from dispatch.features.engine import ACTIVE_SENSORS, build_engine_window_features, features_to_matrix

CRITICAL_RUL = 15
WINDOW_SIZE = 30


class EnginePredictor:
    def __init__(self, model_dir: Path | str) -> None:
        self.model_dir = Path(model_dir)
        self.model = joblib.load(self.model_dir / "engine_rul.pkl")
        meta_path = self.model_dir / "engine.meta.json"
        self.meta: dict[str, Any] = json.loads(meta_path.read_text()) if meta_path.exists() else {}

    def predict_from_window(self, window: pd.DataFrame) -> dict[str, Any]:
        if len(window) < WINDOW_SIZE:
            raise ValueError(f"Need at least {WINDOW_SIZE} cycles of sensor data")
        window = window.sort_values("time_cycles").tail(WINDOW_SIZE)
        unit_nr = int(window["unit_nr"].iloc[0])
        max_cycle = int(window["max_cycle"].iloc[-1]) if "max_cycle" in window.columns else None
        features = build_engine_window_features(window, max_cycle=max_cycle)
        rul = float(max(0.0, self.model.predict(features_to_matrix(features))[0]))
        status = "critical" if rul < CRITICAL_RUL else "warning" if rul < 40 else "healthy"
        return {
            "unit_nr": unit_nr,
            "predicted_rul_cycles": round(rul, 1),
            "status": status,
            "current_cycle": int(window["time_cycles"].iloc[-1]),
            "sensor_readings": {s: round(float(window[s].iloc[-1]), 3) for s in ACTIVE_SENSORS},
            "is_critical": rul < CRITICAL_RUL,
        }

    def predict_unit(self, unit_data: pd.DataFrame, *, at_cycle: int | None = None) -> dict[str, Any]:
        unit_data = unit_data.sort_values("time_cycles")
        if at_cycle is not None:
            unit_data = unit_data[unit_data["time_cycles"] <= at_cycle]
        return self.predict_from_window(unit_data)

    def model_info(self) -> dict[str, Any]:
        return {
            "name": "engine_rul",
            "display_name": "Jet Engine Predictive Maintenance",
            "architecture": self.meta.get("architecture", "Gradient boosting on rolling sensor windows"),
            "metrics": self.meta.get("metrics", {}),
            "notebook_url": self.meta.get("notebook_url", "notebooks/jet-engine-predictive-maintenance-rul.ipynb"),
            "dataset": self.meta.get("dataset", "NASA C-MAPSS FD001 (demo subset)"),
            "critical_rul_threshold": CRITICAL_RUL,
        }
