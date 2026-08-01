"use client";

import type { EngineUnit } from "@/lib/api";
import type { EnginePrediction } from "@/lib/api";

type EngineUnitCardProps = {
  unit: EngineUnit;
  selected: boolean;
  prediction: EnginePrediction | null;
  loading: boolean;
  onSelect: () => void;
};

export function EngineUnitCard({
  unit,
  selected,
  prediction,
  loading,
  onSelect,
}: EngineUnitCardProps) {
  const progress = (unit.current_cycle / unit.max_cycle) * 100;
  const status = prediction?.status ?? "unknown";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border p-4 text-left transition-colors duration-200 ${
        selected
          ? "border-[#2563EB] bg-[#EFF6FF] ring-1 ring-inset ring-[#2563EB]/30"
          : "border-[#E8EAED] bg-white hover:border-[#CBD5E1] hover:bg-[#FAFBFC]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-[#6B7280]">Unit #{unit.unit_nr}</p>
          <p className="mt-0.5 text-sm font-semibold text-[#111827]">
            Cycle {unit.current_cycle}
            <span className="font-normal text-[#6B7280]"> / {unit.max_cycle}</span>
          </p>
        </div>
        {loading && selected ? (
          <span className="flight-spinner shrink-0" />
        ) : prediction ? (
          <span
            className={`shrink-0 px-2 py-0.5 text-xs font-medium ${
              status === "critical"
                ? "bg-[#FEE2E2] text-[#DC2626]"
                : status === "warning"
                  ? "bg-[#FEF3C7] text-[#D97706]"
                  : "bg-[#ECFDF5] text-[#16A34A]"
            }`}
          >
            {status === "critical" ? "Critical" : status === "warning" ? "Monitor" : "Healthy"}
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-[#6B7280]">
          <span>Life consumed</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="mt-1 h-1.5 bg-[#F3F4F6]">
          <div
            className={`h-full transition-all duration-500 ${
              progress > 85 ? "bg-[#DC2626]" : progress > 65 ? "bg-[#D97706]" : "bg-[#2563EB]"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {prediction && (
        <p className="mt-2 text-xs text-[#6B7280]">
          RUL:{" "}
          <span
            className={`font-semibold ${
              status === "critical" ? "text-[#DC2626]" : status === "warning" ? "text-[#D97706]" : "text-[#16A34A]"
            }`}
          >
            {prediction.predicted_rul_cycles.toFixed(0)} cycles
          </span>
        </p>
      )}
    </button>
  );
}
