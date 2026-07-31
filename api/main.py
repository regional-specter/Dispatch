"""Dispatch FastAPI — inference endpoints."""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "src"))

from dispatch.inference.delay import DelayPredictor  # noqa: E402
from dispatch.inference.engine import EnginePredictor  # noqa: E402

MODEL_DIR = Path(os.getenv("MODEL_DIR", REPO_ROOT / "models" / "artifacts"))
SAMPLE_ENGINES = REPO_ROOT / "data" / "samples" / "engines_demo.csv"
SAMPLE_FLIGHTS = REPO_ROOT / "data" / "samples" / "flights_demo.csv"

app = FastAPI(title="Dispatch API", version="0.1.0")
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

delay_predictor: DelayPredictor | None = None
engine_predictor: EnginePredictor | None = None
engines_df: pd.DataFrame | None = None
flights_df: pd.DataFrame | None = None


@app.on_event("startup")
def load_models() -> None:
    global delay_predictor, engine_predictor, engines_df, flights_df
    if (MODEL_DIR / "delay_classifier.pkl").exists():
        delay_predictor = DelayPredictor(MODEL_DIR)
    if (MODEL_DIR / "engine_rul.pkl").exists():
        engine_predictor = EnginePredictor(MODEL_DIR)
    if SAMPLE_ENGINES.exists():
        engines_df = pd.read_csv(SAMPLE_ENGINES)
    if SAMPLE_FLIGHTS.exists():
        flights_df = pd.read_csv(SAMPLE_FLIGHTS)


class DelayPredictionRequest(BaseModel):
    month: int = Field(ge=1, le=12)
    day_of_month: int = Field(ge=1, le=31)
    day_of_week: int = Field(ge=1, le=7)
    crs_dep_time: int
    distance: float = Field(gt=0)
    crs_elapsed_time: float = Field(gt=0)
    origin: str | None = None
    dest: str | None = None
    op_unique_carrier: str | None = None
    carrier_delay_risk: float | None = None
    route_delay_risk: float | None = None


class EnginePredictionRequest(BaseModel):
    unit_nr: int = Field(ge=1)
    at_cycle: int | None = Field(default=None, ge=1)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "models": {"delay": delay_predictor is not None, "engine": engine_predictor is not None},
    }


@app.get("/models/delay")
def get_delay_model() -> dict[str, Any]:
    if delay_predictor is None:
        raise HTTPException(503, "Delay model not loaded")
    return delay_predictor.model_info()


@app.get("/models/engine")
def get_engine_model() -> dict[str, Any]:
    if engine_predictor is None:
        raise HTTPException(503, "Engine model not loaded")
    return engine_predictor.model_info()


@app.post("/predict/delay")
def predict_delay(request: DelayPredictionRequest) -> dict[str, Any]:
    if delay_predictor is None:
        raise HTTPException(503, "Delay model not loaded")
    payload = request.model_dump()
    meta = delay_predictor.meta
    if request.route_delay_risk is None and request.origin and request.dest:
        payload["route_delay_risk"] = meta.get("route_risk_map", {}).get(f"{request.origin}-{request.dest}", 0.2)
    if request.carrier_delay_risk is None and request.op_unique_carrier:
        payload["carrier_delay_risk"] = meta.get("carrier_risk_map", {}).get(request.op_unique_carrier, 0.2)
    return delay_predictor.predict(payload)


@app.post("/predict/engine")
def predict_engine(request: EnginePredictionRequest) -> dict[str, Any]:
    if engine_predictor is None or engines_df is None:
        raise HTTPException(503, "Engine model not loaded")
    unit_data = engines_df[engines_df["unit_nr"] == request.unit_nr]
    if unit_data.empty:
        raise HTTPException(404, f"Engine unit {request.unit_nr} not found")
    try:
        return engine_predictor.predict_unit(unit_data, at_cycle=request.at_cycle)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/dashboard/summary")
def dashboard_summary() -> dict[str, Any]:
    summary: dict[str, Any] = {"as_of": datetime.now(timezone.utc).strftime("%B %d, %Y")}
    if delay_predictor and flights_df is not None:
        recent = flights_df.tail(200)
        delayed = (recent["arr_delay"] > 15).mean()
        avg_delay = recent.loc[recent["arr_delay"] > 0, "arr_delay"].mean()
        summary["delay"] = {
            "delay_rate": round(float(delayed), 4),
            "avg_delay_minutes": round(float(avg_delay) if not pd.isna(avg_delay) else 0, 1),
            "metrics": delay_predictor.meta.get("metrics", {}),
            "sparkline": _delay_sparkline(flights_df),
        }
    if engine_predictor and engines_df is not None:
        summary["engine"] = {**_engine_fleet_stats(), "metrics": engine_predictor.meta.get("metrics", {}), "sparkline": _engine_sparkline()}
    return summary


def _delay_sparkline(df: pd.DataFrame, days: int = 14) -> list[dict[str, Any]]:
    df = df.copy()
    df["fl_date"] = pd.to_datetime(df["fl_date"])
    daily = df.groupby(df["fl_date"].dt.date)["arr_delay"].apply(lambda s: float((s > 15).mean())).tail(days)
    return [{"date": str(idx), "value": round(val, 4)} for idx, val in daily.items()]


def _engine_fleet_stats() -> dict[str, Any]:
    assert engines_df is not None and engine_predictor is not None
    rul_values, critical = [], 0
    for unit in engines_df["unit_nr"].unique()[:20]:
        try:
            result = engine_predictor.predict_unit(engines_df[engines_df["unit_nr"] == unit])
            rul_values.append(result["predicted_rul_cycles"])
            critical += int(result["is_critical"])
        except ValueError:
            continue
    return {
        "avg_rul_cycles": round(sum(rul_values) / len(rul_values), 1) if rul_values else 0,
        "critical_engines": critical,
        "fleet_sample_size": len(rul_values),
    }


def _engine_sparkline() -> list[dict[str, Any]]:
    assert engines_df is not None and engine_predictor is not None
    unit = int(engines_df["unit_nr"].iloc[0])
    unit_data = engines_df[engines_df["unit_nr"] == unit].sort_values("time_cycles")
    points = []
    for cycle in range(30, len(unit_data) + 1, max(1, len(unit_data) // 14)):
        try:
            result = engine_predictor.predict_unit(unit_data, at_cycle=cycle)
            points.append({"date": f"Cycle {cycle}", "value": result["predicted_rul_cycles"]})
        except ValueError:
            continue
    return points[-14:]


@app.get("/engines/units")
def list_engine_units() -> list[dict[str, Any]]:
    if engines_df is None:
        return []
    return sorted(
        [{"unit_nr": int(u), "max_cycle": int(g["max_cycle"].iloc[0]), "current_cycle": int(g["time_cycles"].max())}
         for u, g in engines_df.groupby("unit_nr")],
        key=lambda u: u["unit_nr"],
    )
