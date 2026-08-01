"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { CycleScrubber, EngineCharts } from "@/components/engines/EngineCharts";
import { EngineSchematic, SensorBars } from "@/components/engines/EngineSchematic";
import { EngineUnitCard } from "@/components/engines/EngineUnitCard";
import { RulGauge } from "@/components/engines/RulGauge";
import {
  API_URL,
  type EnginePrediction,
  type EngineTelemetry,
  type EngineUnit,
  type ModelInfo,
  type RulTimelinePoint,
} from "@/lib/api";
import { easeInOutCubic } from "@/lib/map-projection";

function useAnimatedNumber(target: number, duration = 600): number {
  const [value, setValue] = useState(target);
  const currentRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = currentRef.current;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    function tick(now: number) {
      const t = easeInOutCubic(Math.min(1, (now - start) / duration));
      const next = from + (target - from) * t;
      currentRef.current = next;
      setValue(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

export default function EnginesClient({
  modelInfo,
  initialUnits,
}: {
  modelInfo: ModelInfo | null;
  initialUnits: EngineUnit[];
}) {
  const defaultUnit =
    initialUnits.find((u) => u.current_cycle >= 80 && u.current_cycle <= 150)?.unit_nr ??
    initialUnits[0]?.unit_nr ??
    1;

  const [selectedUnit, setSelectedUnit] = useState(defaultUnit);
  const [scrubCycle, setScrubCycle] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<EnginePrediction | null>(null);
  const [predictions, setPredictions] = useState<Record<number, EnginePrediction>>({});
  const [telemetry, setTelemetry] = useState<EngineTelemetry | null>(null);
  const [rulTimeline, setRulTimeline] = useState<RulTimelinePoint[]>([]);
  const [filter, setFilter] = useState<"all" | "critical" | "healthy">("all");

  const unit = initialUnits.find((u) => u.unit_nr === selectedUnit);
  const effectiveCycle = scrubCycle ?? unit?.current_cycle ?? 30;
  const animatedCycle = Math.round(useAnimatedNumber(effectiveCycle, 500));
  const metrics = modelInfo?.metrics ?? {};

  const loadEngineData = useCallback(
    async (unitNr: number, atCycle?: number) => {
      setLoading(true);
      setError(null);
      try {
        const cycleParam = atCycle ?? null;
        const [predRes, telemRes, timelineRes] = await Promise.all([
          fetch(`${API_URL}/predict/engine`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ unit_nr: unitNr, at_cycle: cycleParam }),
          }),
          fetch(
            `${API_URL}/engines/units/${unitNr}/telemetry${cycleParam ? `?at_cycle=${cycleParam}` : ""}`,
          ),
          fetch(`${API_URL}/engines/units/${unitNr}/rul-timeline`),
        ]);

        if (!predRes.ok) throw new Error(await predRes.text());
        const pred: EnginePrediction = await predRes.json();
        setPrediction(pred);
        setPredictions((prev) => ({ ...prev, [unitNr]: pred }));

        if (telemRes.ok) setTelemetry(await telemRes.json());
        if (timelineRes.ok) setRulTimeline(await timelineRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load engine data");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedUnit) {
      setScrubCycle(null);
      void loadEngineData(selectedUnit);
    }
  }, [selectedUnit, loadEngineData]);

  useEffect(() => {
    if (selectedUnit && scrubCycle !== null) {
      const timer = setTimeout(() => loadEngineData(selectedUnit, scrubCycle), 200);
      return () => clearTimeout(timer);
    }
  }, [scrubCycle, selectedUnit, loadEngineData]);

  const filteredUnits = initialUnits.filter((u) => {
    const pred = predictions[u.unit_nr];
    if (filter === "all") return true;
    if (filter === "critical") return pred?.status === "critical" || pred?.status === "warning";
    return pred?.status === "healthy";
  });

  const criticalCount = Object.values(predictions).filter(
    (p) => p.status === "critical" || p.status === "warning",
  ).length;

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <div className="shrink-0 px-6 pt-8">
        <PageHeader
          title="Jet Engine Predictive Maintenance"
          subtitle="C-MAPSS sensor replay · RUL forecasting · fleet health monitoring"
          activeTab="detail"
          detailHref="/engines"
        />
      </div>

      <div className="flex min-h-0 flex-1 border-t border-[#E8EAED]">
        {/* Left — fleet list */}
        <aside className="flex w-full max-w-[380px] shrink-0 flex-col border-r border-[#E8EAED] bg-white">
          <div className="border-b border-[#E8EAED] px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#111827]">
                Fleet
                <span className="ml-1.5 bg-[#F3F4F6] px-2 py-0.5 text-xs font-medium text-[#6B7280]">
                  {initialUnits.length}
                </span>
              </h2>
              {criticalCount > 0 && (
                <span className="bg-[#FEE2E2] px-2 py-0.5 text-xs font-medium text-[#DC2626]">
                  {criticalCount} alert{criticalCount === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <div className="mt-3 flex gap-1">
              {(["all", "critical", "healthy"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-[#111827] text-white"
                      : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E8EAED]"
                  }`}
                >
                  {f === "all" ? "All" : f === "critical" ? "Alerts" : "Healthy"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {filteredUnits.map((u) => (
              <EngineUnitCard
                key={u.unit_nr}
                unit={u}
                selected={u.unit_nr === selectedUnit}
                prediction={predictions[u.unit_nr] ?? (u.unit_nr === selectedUnit ? prediction : null)}
                loading={loading && u.unit_nr === selectedUnit}
                onSelect={() => setSelectedUnit(u.unit_nr)}
              />
            ))}
          </div>

          <div className="border-t border-[#E8EAED] p-4">
            <p className="text-xs font-medium text-[#6B7280]">Model holdout</p>
            <dl className="mt-2 space-y-1.5">
              {metrics.rmse_cycles != null && (
                <div className="flex justify-between text-xs">
                  <dt className="text-[#6B7280]">RMSE</dt>
                  <dd className="font-medium">{Number(metrics.rmse_cycles).toFixed(2)} cycles</dd>
                </div>
              )}
              {metrics.mae_cycles != null && (
                <div className="flex justify-between text-xs">
                  <dt className="text-[#6B7280]">MAE</dt>
                  <dd className="font-medium">{Number(metrics.mae_cycles).toFixed(2)} cycles</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>

        {/* Right — health dashboard */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-[#F7F8FA] p-4">
          <div className="space-y-4">
            {unit && (
              <CycleScrubber
                min={30}
                max={unit.current_cycle}
                value={animatedCycle}
                onChange={setScrubCycle}
                disabled={loading}
              />
            )}

            <RulGauge
              prediction={prediction}
              maxCycle={unit?.max_cycle ?? 0}
              loading={loading}
            />

            <EngineSchematic prediction={prediction} loading={loading} />

            <EngineCharts telemetry={telemetry} rulTimeline={rulTimeline} loading={loading} />

            <SensorBars prediction={prediction} />

            {error && (
              <p className="border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
