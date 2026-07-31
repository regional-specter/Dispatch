"""Feature engineering for the flight delay predictor."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

DELAY_FEATURE_COLUMNS = [
    "route_delay_risk",
    "carrier_delay_risk",
    "scheduled_speed_mph",
    "dep_time_sin",
    "dep_time_cos",
    "crs_elapsed_time",
    "distance",
    "month",
    "day_of_month",
    "day_of_week",
    "day_sin",
    "day_cos",
]


def _cyclic(value: float, period: float) -> tuple[float, float]:
    angle = 2 * math.pi * value / period
    return math.sin(angle), math.cos(angle)


def _parse_dep_hour(crs_dep_time: int | float) -> float:
    t = int(crs_dep_time)
    return (t // 100) + (t % 100) / 60.0


def build_delay_features_row(
    *,
    month: int,
    day_of_month: int,
    day_of_week: int,
    crs_dep_time: int,
    distance: float,
    crs_elapsed_time: float,
    carrier_delay_risk: float = 0.2,
    route_delay_risk: float = 0.2,
) -> dict[str, float]:
    dep_hour = _parse_dep_hour(crs_dep_time)
    dep_sin, dep_cos = _cyclic(dep_hour, 24)
    day_sin, day_cos = _cyclic(day_of_week, 7)
    scheduled_speed_mph = distance / max(crs_elapsed_time / 60.0, 0.1)

    return {
        "route_delay_risk": route_delay_risk,
        "carrier_delay_risk": carrier_delay_risk,
        "scheduled_speed_mph": scheduled_speed_mph,
        "dep_time_sin": dep_sin,
        "dep_time_cos": dep_cos,
        "crs_elapsed_time": crs_elapsed_time,
        "distance": distance,
        "month": month,
        "day_of_month": day_of_month,
        "day_of_week": day_of_week,
        "day_sin": day_sin,
        "day_cos": day_cos,
    }


def build_delay_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    if "fl_date" in out.columns:
        out["fl_date"] = pd.to_datetime(out["fl_date"])
        out["month"] = out["fl_date"].dt.month
        out["day_of_month"] = out["fl_date"].dt.day
        out["day_of_week"] = out["fl_date"].dt.dayofweek + 1

    dep_hours = out["crs_dep_time"].apply(_parse_dep_hour)
    out["dep_time_sin"] = np.sin(2 * np.pi * dep_hours / 24)
    out["dep_time_cos"] = np.cos(2 * np.pi * dep_hours / 24)
    out["day_sin"] = np.sin(2 * np.pi * out["day_of_week"] / 7)
    out["day_cos"] = np.cos(2 * np.pi * out["day_of_week"] / 7)
    out["scheduled_speed_mph"] = out["distance"] / (out["crs_elapsed_time"] / 60.0).clip(lower=0.1)

    if "carrier_delay_risk" not in out.columns:
        out["carrier_delay_risk"] = out.groupby("op_unique_carrier")["is_delayed"].transform("mean").fillna(out["is_delayed"].mean())

    if "route_delay_risk" not in out.columns:
        out["route_key"] = out["origin"] + "-" + out["dest"]
        out["route_delay_risk"] = out.groupby("route_key")["is_delayed"].transform("mean").fillna(out["is_delayed"].mean())

    return out


def features_to_matrix(features: dict[str, Any] | pd.Series) -> np.ndarray:
    return np.array([[float(features[col]) for col in DELAY_FEATURE_COLUMNS]], dtype=np.float64)
