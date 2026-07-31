"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { API_URL, type EnginePrediction, type EngineUnit, type ModelInfo } from "@/lib/api";

export default function EnginesClient({ modelInfo, initialUnits }: { modelInfo: ModelInfo | null; initialUnits: EngineUnit[] }) {
  const defaultUnit = initialUnits.find((u) => u.current_cycle >= 80 && u.current_cycle <= 150)?.unit_nr ?? initialUnits[0]?.unit_nr ?? 1;
  const [selectedUnit, setSelectedUnit] = useState(defaultUnit);
  const [atCycle, setAtCycle] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnginePrediction | null>(null);
  const selected = initialUnits.find((u) => u.unit_nr === selectedUnit);
  const metrics = modelInfo?.metrics ?? {};

  useEffect(() => { if (selectedUnit) void runPrediction(selectedUnit); }, [selectedUnit]);

  async function runPrediction(unitNr: number, cycle?: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/predict/engine`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unit_nr: unitNr, at_cycle: cycle ?? null }) });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  const maxSensor = result ? Math.max(...Object.values(result.sensor_readings)) : 1;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader title="Jet Engine Predictive Maintenance" subtitle="Remaining useful life from rolling C-MAPSS sensor windows" activeTab="detail" detailHref="/engines" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#E8EAED] bg-white p-6">
          <label className="block text-sm"><span className="text-[#6B7280]">Engine unit</span>
            <select className="mt-1 w-full rounded-lg border border-[#E8EAED] px-3 py-2 text-sm" value={selectedUnit} onChange={(e) => setSelectedUnit(Number(e.target.value))}>
              {initialUnits.map((u) => <option key={u.unit_nr} value={u.unit_nr}>Engine #{u.unit_nr} — {u.current_cycle}/{u.max_cycle} cycles</option>)}
            </select></label>
          <label className="mt-4 block text-sm"><span className="text-[#6B7280]">Replay at cycle (optional)</span>
            <input type="number" min={30} max={selected?.max_cycle} placeholder={`Latest: ${selected?.current_cycle ?? "—"}`} className="mt-1 w-full rounded-lg border border-[#E8EAED] px-3 py-2 text-sm" value={atCycle} onChange={(e) => setAtCycle(e.target.value === "" ? "" : Number(e.target.value))} /></label>
          <button type="button" disabled={loading} onClick={() => runPrediction(selectedUnit, atCycle === "" ? undefined : atCycle)} className="mt-6 w-full rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{loading ? "Scoring…" : "Refresh RUL"}</button>
          {error && <p className="mt-3 text-sm text-[#DC2626]">{error}</p>}
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E8EAED] bg-white p-6">
            <h2 className="text-base font-semibold">RUL forecast</h2>
            {result ? (
              <div className="mt-4">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${result.status === "critical" ? "bg-[#FEE2E2] text-[#DC2626]" : result.status === "warning" ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#ECFDF5] text-[#16A34A]"}`}>
                  {result.status === "critical" ? "Critical" : result.status === "warning" ? "Monitor" : "Healthy"}
                </span>
                <p className="mt-4 text-4xl font-semibold">{result.predicted_rul_cycles.toFixed(0)} cycles</p>
                <p className="text-sm text-[#6B7280]">Current cycle: {result.current_cycle}</p>
              </div>
            ) : <p className="mt-4 text-sm text-[#6B7280]">Select an engine.</p>}
          </div>
          {result && (
            <div className="rounded-xl border border-[#E8EAED] bg-white p-6">
              <h2 className="text-base font-semibold">Sensor health</h2>
              <div className="mt-4 space-y-3">
                {Object.entries(result.sensor_readings).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs text-[#6B7280]"><span>{key}</span><span>{value.toFixed(3)}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-[#F3F4F6]"><div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${(value / maxSensor) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-[#E8EAED] bg-white p-6">
            <h2 className="text-base font-semibold">Model metrics</h2>
            <dl className="mt-4 space-y-3">
              {metrics.rmse_cycles != null && <div className="flex justify-between text-sm"><dt className="text-[#6B7280]">RMSE</dt><dd>{Number(metrics.rmse_cycles).toFixed(2)} cycles</dd></div>}
              {metrics.mae_cycles != null && <div className="flex justify-between text-sm"><dt className="text-[#6B7280]">MAE</dt><dd>{Number(metrics.mae_cycles).toFixed(2)} cycles</dd></div>}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
