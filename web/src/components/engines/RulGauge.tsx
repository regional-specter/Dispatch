"use client";

import { CRITICAL_RUL, MAX_RUL_DISPLAY, statusColor } from "@/lib/engine-sensors";
import type { EnginePrediction } from "@/lib/api";

type RulGaugeProps = {
  prediction: EnginePrediction | null;
  maxCycle: number;
  loading: boolean;
};

export function RulGauge({ prediction, maxCycle, loading }: RulGaugeProps) {
  const rul = prediction?.predicted_rul_cycles ?? 0;
  const currentCycle = prediction?.current_cycle ?? 0;
  const pct = Math.min(100, (rul / MAX_RUL_DISPLAY) * 100);
  const color = prediction ? statusColor(prediction.status) : "#94A3B8";
  const criticalPct = (CRITICAL_RUL / MAX_RUL_DISPLAY) * 100;

  return (
    <div className="border border-[#E8EAED] bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
            Remaining useful life
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-[#111827]">
            {loading ? "—" : rul.toFixed(0)}
            <span className="ml-1 text-lg font-medium text-[#6B7280]">cycles</span>
          </p>
        </div>
        {prediction && (
          <span
            className="px-2.5 py-1 text-sm font-medium"
            style={{
              backgroundColor: `${color}18`,
              color,
            }}
          >
            {prediction.status === "critical"
              ? "Schedule maintenance"
              : prediction.status === "warning"
                ? "Monitor closely"
                : "Operational"}
          </span>
        )}
      </div>

      <div className="relative mt-6">
        <div className="h-3 bg-[#F3F4F6]">
          <div
            className="rul-gauge-fill h-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <div
          className="absolute top-0 h-3 w-px bg-[#DC2626]"
          style={{ left: `${criticalPct}%` }}
          title={`Critical threshold: ${CRITICAL_RUL} cycles`}
        />
        <div className="mt-1 flex justify-between text-[10px] text-[#9CA3AF]">
          <span>0</span>
          <span style={{ marginLeft: `${criticalPct - 8}%` }}>Critical ({CRITICAL_RUL})</span>
          <span>{MAX_RUL_DISPLAY}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#E8EAED] pt-4">
        <div>
          <p className="text-xs text-[#6B7280]">Current cycle</p>
          <p className="text-lg font-semibold tabular-nums">{currentCycle}</p>
        </div>
        <div>
          <p className="text-xs text-[#6B7280]">Max cycle</p>
          <p className="text-lg font-semibold tabular-nums">{maxCycle}</p>
        </div>
        <div>
          <p className="text-xs text-[#6B7280]">Wear</p>
          <p className="text-lg font-semibold tabular-nums">
            {maxCycle ? ((currentCycle / maxCycle) * 100).toFixed(0) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}
