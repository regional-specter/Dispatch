"use client";

import { HOLD, ZONES, type CargoMetrics, type ZoneName } from "@/lib/cargo-physics";

const ZONE_COLORS: Record<ZoneName, string> = {
  FWD: "bg-[#4F8CFF]",
  CENTER: "bg-[#7C5CFC]",
  AFT: "bg-[#3ECF8E]",
};

export function CargoMetricsSidebar({
  metrics,
  selectedInfo,
  onAutoBalance,
  onReset,
}: {
  metrics: CargoMetrics;
  selectedInfo: string;
  onAutoBalance: () => void;
  onReset: () => void;
}) {
  const cgMarkerPct = Math.max(2, Math.min(98, (metrics.cgX / HOLD.cells.x) * 100));
  const cgBarPct = Math.max(0, Math.min(100, 100 - metrics.cgOffset * 25));
  const massBarPct = Math.min(100, (metrics.totalMassKg / HOLD.maxPayloadKg) * 100);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#E8EAED] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#111827]">Load Planner</h2>
        <p className="mt-0.5 text-xs text-[#6B7280]">Boeing 777F main deck · ULD placement</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="rounded-xl border border-[#E8EAED] bg-gradient-to-br from-[#F8FAFF] to-[#F3F0FF] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B7280]">Load Status</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                metrics.status === "OK"
                  ? "bg-[#DCFCE7] text-[#16A34A]"
                  : "bg-[#FEF3C7] text-[#D97706]"
              }`}
            >
              {metrics.status}
            </span>
          </div>
          <div className="mt-4 text-center">
            <div className="text-3xl font-semibold text-[#111827]">
              {Math.round(metrics.complianceScore)}%
            </div>
            <div className="text-xs text-[#6B7280]">Compliance score</div>
          </div>
        </div>

        <div className="rounded-xl border border-[#E8EAED] bg-white p-4">
          <div className="text-xs font-medium text-[#6B7280]">Center of Gravity (Longitudinal)</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold text-[#111827]">{metrics.cgX.toFixed(2)}</div>
              <div className="text-[10px] text-[#6B7280]">Current CG</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-[#9CA3AF]">{metrics.targetCgX.toFixed(2)}</div>
              <div className="text-[10px] text-[#6B7280]">Target ZFCG</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-[#111827]">{metrics.cgOffset.toFixed(2)}</div>
              <div className="text-[10px] text-[#6B7280]">Offset</div>
            </div>
          </div>
          <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-[#E8EAED]">
            <div
              className="h-full rounded-full bg-[#2563EB] transition-all duration-200"
              style={{ width: `${cgBarPct}%` }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#22C55E] shadow transition-all duration-200"
              style={{ left: `${cgMarkerPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#E8EAED] bg-white p-4">
          <div className="text-xs font-medium text-[#6B7280]">Total Payload</div>
          <div className="mt-2 text-2xl font-semibold text-[#111827]">
            {Math.round(metrics.totalMassKg).toLocaleString()}
            <span className="ml-1 text-sm font-normal text-[#6B7280]">
              / {HOLD.maxPayloadKg.toLocaleString()} kg
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8EAED]">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                metrics.payloadOk ? "bg-[#2563EB]" : "bg-[#DC2626]"
              }`}
              style={{ width: `${massBarPct}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-[#6B7280]">
            Hold utilization:{" "}
            <strong className="text-[#111827]">
              {(metrics.volumeUtilization * 100).toFixed(1)}%
            </strong>
          </div>
        </div>

        <div className="rounded-xl border border-[#E8EAED] bg-white p-4">
          <div className="text-xs font-medium text-[#6B7280]">Compartment Zones</div>
          <div className="mt-3 space-y-2.5">
            {(Object.keys(ZONES) as ZoneName[]).map((name) => {
              const w = metrics.zoneWeights[name];
              const max = ZONES[name].maxWeightKg;
              const pct = Math.min(100, (w / max) * 100);
              return (
                <div key={name} className="grid grid-cols-[52px_1fr_auto] items-center gap-2 text-xs">
                  <span className="font-medium text-[#374151]">{name}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#E8EAED]">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${ZONE_COLORS[name]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#6B7280]">
                    {Math.round(w).toLocaleString()} / {(max / 1000).toFixed(0)}k
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[#E8EAED] bg-white p-4">
          <div className="text-xs font-medium text-[#6B7280]">Selected Package</div>
          <p className="mt-2 text-sm text-[#374151]">{selectedInfo}</p>
        </div>
      </div>

      <div className="space-y-2 border-t border-[#E8EAED] p-4">
        <button
          type="button"
          onClick={onAutoBalance}
          className="w-full bg-[#2563EB] px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
        >
          Auto-Balance
        </button>
        <button
          type="button"
          onClick={onReset}
          className="w-full border border-[#E8EAED] bg-white px-3 py-2.5 text-sm font-medium text-[#374151] transition-colors hover:bg-[#F7F8FA]"
        >
          Reset Load
        </button>
        <p className="text-center text-[10px] leading-relaxed text-[#9CA3AF]">
          Left-click drag ULD freely · Right-click orbit · Invalid drops revert
        </p>
      </div>
    </div>
  );
}
