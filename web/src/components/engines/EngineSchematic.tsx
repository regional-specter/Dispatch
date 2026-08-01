"use client";

import {
  SENSOR_GROUPS,
  SENSOR_LABELS,
  sensorHealth,
  sensorHealthColor,
} from "@/lib/engine-sensors";
import type { EnginePrediction } from "@/lib/api";

type EngineSchematicProps = {
  prediction: EnginePrediction | null;
  loading: boolean;
};

export function EngineSchematic({ prediction, loading }: EngineSchematicProps) {
  const readings = prediction?.sensor_readings ?? {};

  function zoneColor(sensors: readonly string[]): string {
    if (loading || !prediction) return "#E5E7EB";
    const healths = sensors.map((s) => sensorHealth(readings[s] ?? 1));
    if (healths.includes("critical")) return "#FEE2E2";
    if (healths.includes("warning")) return "#FEF3C7";
    return "#DBEAFE";
  }

  function zoneStroke(sensors: readonly string[]): string {
    if (loading || !prediction) return "#D1D5DB";
    const healths = sensors.map((s) => sensorHealth(readings[s] ?? 1));
    if (healths.includes("critical")) return "#DC2626";
    if (healths.includes("warning")) return "#D97706";
    return "#2563EB";
  }

  return (
    <div className="border border-[#E8EAED] bg-[#FAFBFC] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
          Turbofan health map
        </p>
        <p className="text-xs text-[#6B7280]">C-MAPSS FD001 · Live sensors</p>
      </div>

      <svg viewBox="0 0 520 140" className="mx-auto mt-4 w-full max-w-lg" aria-hidden>
        {/* Engine body outline */}
        <rect x="20" y="50" width="480" height="40" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />

        {/* Fan */}
        <rect
          x="30"
          y="45"
          width="90"
          height="50"
          fill={zoneColor(SENSOR_GROUPS.fan.sensors)}
          stroke={zoneStroke(SENSOR_GROUPS.fan.sensors)}
          strokeWidth={1.5}
          className="engine-zone"
        />
        <text x="75" y="72" textAnchor="middle" fontSize="10" fontWeight="600" fill="#374151">
          FAN
        </text>

        {/* Compressor */}
        <rect
          x="130"
          y="42"
          width="160"
          height="56"
          fill={zoneColor(SENSOR_GROUPS.compressor.sensors)}
          stroke={zoneStroke(SENSOR_GROUPS.compressor.sensors)}
          strokeWidth={1.5}
          className="engine-zone"
        />
        <text x="210" y="72" textAnchor="middle" fontSize="10" fontWeight="600" fill="#374151">
          COMPRESSOR
        </text>

        {/* Turbine / flow */}
        <rect
          x="300"
          y="45"
          width="120"
          height="50"
          fill={zoneColor(SENSOR_GROUPS.turbine.sensors)}
          stroke={zoneStroke(SENSOR_GROUPS.turbine.sensors)}
          strokeWidth={1.5}
          className="engine-zone"
        />
        <text x="360" y="72" textAnchor="middle" fontSize="10" fontWeight="600" fill="#374151">
          TURBINE
        </text>

        {/* Exhaust */}
        <polygon
          points="430,55 490,70 430,85"
          fill={zoneColor(SENSOR_GROUPS.turbine.sensors)}
          stroke={zoneStroke(SENSOR_GROUPS.turbine.sensors)}
          strokeWidth={1.5}
        />

        {/* Inlet airflow animation */}
        <line x1="0" y1="70" x2="28" y2="70" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 3" className="engine-flow" />
        <line x1="492" y1="70" x2="520" y2="70" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 3" className="engine-flow" style={{ animationDelay: "0.5s" }} />

        {/* Spinner hub */}
        <circle cx="75" cy="70" r="12" fill="none" stroke="#6B7280" strokeWidth="1" className={loading ? "" : "engine-spinner"} />
      </svg>

      {prediction && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {Object.entries(SENSOR_GROUPS).map(([key, group]) => {
            const avg =
              group.sensors.reduce((sum, s) => sum + (readings[s] ?? 0), 0) / group.sensors.length;
            const health = sensorHealth(avg);
            return (
              <div key={key} className="border border-[#E8EAED] bg-white px-2 py-1.5">
                <p className="text-[10px] text-[#6B7280]">{group.label}</p>
                <p className="text-xs font-semibold" style={{ color: sensorHealthColor(health) }}>
                  {health === "critical" ? "Alert" : health === "warning" ? "Elevated" : "Normal"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SensorBars({ prediction }: { prediction: EnginePrediction | null }) {
  if (!prediction) return null;

  const entries = Object.entries(prediction.sensor_readings);
  const maxVal = Math.max(...entries.map(([, v]) => v));

  return (
    <div className="border border-[#E8EAED] bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
        Sensor telemetry
      </p>
      <div className="mt-4 space-y-2.5">
        {entries.map(([key, value]) => {
          const health = sensorHealth(value);
          const color = sensorHealthColor(health);
          return (
            <div key={key}>
              <div className="flex justify-between text-xs">
                <span className="text-[#6B7280]">{SENSOR_LABELS[key] ?? key}</span>
                <span className="font-medium tabular-nums text-[#111827]">{value.toFixed(3)}</span>
              </div>
              <div className="mt-1 h-2 bg-[#F3F4F6]">
                <div
                  className="sensor-bar-fill h-full transition-all duration-500"
                  style={{ width: `${(value / maxVal) * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
