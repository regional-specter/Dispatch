"""Feature engineering for jet engine RUL prediction."""

from __future__ import annotations

import pandas as pd

ENGINE_FEATURE_COLUMNS = [
    "s2_mean", "s3_mean", "s4_mean", "s7_mean", "s11_mean", "s12_mean",
    "s13_mean", "s15_mean", "s17_mean", "s20_mean", "s21_mean",
    "s2_std", "s3_std", "s4_std", "s7_std", "s11_std", "s12_std", "cycle_position",
]

ACTIVE_SENSORS = ["s2", "s3", "s4", "s7", "s11", "s12", "s13", "s15", "s17", "s20", "s21"]


def build_engine_window_features(window: pd.DataFrame, *, max_cycle: int | None = None) -> dict[str, float]:
    features: dict[str, float] = {}
    for sensor in ACTIVE_SENSORS:
        values = window[sensor].astype(float)
        features[f"{sensor}_mean"] = float(values.mean())
        features[f"{sensor}_std"] = float(values.std(ddof=0))

    current_cycle = int(window["time_cycles"].iloc[-1])
    if max_cycle is None:
        max_cycle = current_cycle + 125
    features["cycle_position"] = current_cycle / max(max_cycle, 1)
    return features


def features_to_matrix(features: dict[str, float]):
    import numpy as np
    return np.array([[features[col] for col in ENGINE_FEATURE_COLUMNS]], dtype=np.float64)
