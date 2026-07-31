"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { API_URL, type DelayPrediction, type ModelInfo } from "@/lib/api";

const CARRIERS = ["AA", "DL", "UA", "WN", "B6", "AS"];
const ROUTES = [
  { origin: "JFK", dest: "LAX", distance: 2475, elapsed: 360 },
  { origin: "ORD", dest: "ATL", distance: 606, elapsed: 120 },
  { origin: "DFW", dest: "DEN", distance: 641, elapsed: 130 },
  { origin: "EWR", dest: "MCO", distance: 937, elapsed: 165 },
];

export default function DelayForm({ modelInfo }: { modelInfo: ModelInfo | null }) {
  const [routeIdx, setRouteIdx] = useState(0);
  const [carrier, setCarrier] = useState("AA");
  const [depTime, setDepTime] = useState("1430");
  const [month, setMonth] = useState(7);
  const [day, setDay] = useState(15);
  const [dow, setDow] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DelayPrediction | null>(null);
  const route = ROUTES[routeIdx];
  const metrics = modelInfo?.metrics ?? {};

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/predict/delay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, day_of_month: day, day_of_week: dow, crs_dep_time: parseInt(depTime, 10), distance: route.distance, crs_elapsed_time: route.elapsed, origin: route.origin, dest: route.dest, op_unique_carrier: carrier }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader title="Flight Delay Predictor" subtitle="Score a scheduled flight for disruption risk" activeTab="detail" detailHref="/delays" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="rounded-xl border border-[#E8EAED] bg-white p-6">
          <h2 className="text-base font-semibold">Flight details</h2>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <label className="col-span-2 block text-sm"><span className="text-[#6B7280]">Route</span>
              <select className="mt-1 w-full rounded-lg border border-[#E8EAED] px-3 py-2 text-sm" value={routeIdx} onChange={(e) => setRouteIdx(Number(e.target.value))}>
                {ROUTES.map((r, i) => <option key={r.origin + r.dest} value={i}>{r.origin} → {r.dest}</option>)}
              </select></label>
            <label className="block text-sm"><span className="text-[#6B7280]">Carrier</span>
              <select className="mt-1 w-full rounded-lg border border-[#E8EAED] px-3 py-2 text-sm" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
            <label className="block text-sm"><span className="text-[#6B7280]">Departure (hhmm)</span>
              <input className="mt-1 w-full rounded-lg border border-[#E8EAED] px-3 py-2 text-sm" value={depTime} onChange={(e) => setDepTime(e.target.value)} /></label>
            <label className="block text-sm"><span className="text-[#6B7280]">Month</span>
              <input type="number" min={1} max={12} className="mt-1 w-full rounded-lg border border-[#E8EAED] px-3 py-2 text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))} /></label>
            <label className="block text-sm"><span className="text-[#6B7280]">Day</span>
              <input type="number" min={1} max={31} className="mt-1 w-full rounded-lg border border-[#E8EAED] px-3 py-2 text-sm" value={day} onChange={(e) => setDay(Number(e.target.value))} /></label>
          </div>
          <button type="submit" disabled={loading} className="mt-6 w-full rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{loading ? "Scoring…" : "Predict delay risk"}</button>
          {error && <p className="mt-3 text-sm text-[#DC2626]">{error}</p>}
        </form>
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E8EAED] bg-white p-6">
            <h2 className="text-base font-semibold">Prediction</h2>
            {result ? (
              <div className="mt-4">
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${result.is_delayed ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#ECFDF5] text-[#16A34A]"}`}>{result.is_delayed ? "Likely delayed" : "On time"}</span>
                <p className="mt-4 text-4xl font-semibold">{(result.delay_probability * 100).toFixed(1)}%</p>
                <p className="text-sm text-[#6B7280]">Delay probability (&gt;15 min)</p>
                <p className="mt-4 text-2xl font-semibold">{result.predicted_delay_minutes.toFixed(0)} min</p>
                <p className="text-sm text-[#6B7280]">Predicted duration</p>
              </div>
            ) : <p className="mt-4 text-sm text-[#6B7280]">Submit a flight to see results.</p>}
          </div>
          <div className="rounded-xl border border-[#E8EAED] bg-white p-6">
            <h2 className="text-base font-semibold">Model metrics</h2>
            <dl className="mt-4 space-y-3">
              {metrics.roc_auc != null && <div className="flex justify-between text-sm"><dt className="text-[#6B7280]">ROC-AUC</dt><dd className="font-medium">{Number(metrics.roc_auc).toFixed(4)}</dd></div>}
              {metrics.delay_mae_minutes != null && <div className="flex justify-between text-sm"><dt className="text-[#6B7280]">Delay MAE</dt><dd className="font-medium">{Number(metrics.delay_mae_minutes).toFixed(1)} min</dd></div>}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
