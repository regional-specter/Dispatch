"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/PageHeader";
import { FlightRouteCard } from "@/components/delays/FlightRouteCard";
import { API_URL, type DelayPrediction, type ModelInfo } from "@/lib/api";
import { CARRIERS, FLIGHT_ROUTES } from "@/lib/flight-routes";

const FlightRouteMap = dynamic(
  () => import("@/components/delays/FlightRouteMap").then((m) => m.FlightRouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[520px] items-center justify-center border border-[#E8EAED] bg-[#EEF1F5]">
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <span className="flight-spinner" />
          Loading map…
        </div>
      </div>
    ),
  },
);

export default function DelayForm({ modelInfo }: { modelInfo: ModelInfo | null }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [carrier, setCarrier] = useState("AA");
  const [depTime, setDepTime] = useState("1430");
  const [month, setMonth] = useState(7);
  const [day, setDay] = useState(15);
  const [dow, setDow] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, DelayPrediction>>({});

  const route = FLIGHT_ROUTES[selectedIdx];
  const result = predictions[route.id] ?? null;
  const metrics = modelInfo?.metrics ?? {};

  const scoreRoute = useCallback(
    async (r: (typeof FLIGHT_ROUTES)[number]) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/predict/delay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month,
            day_of_month: day,
            day_of_week: dow,
            crs_dep_time: parseInt(depTime, 10),
            distance: r.distance,
            crs_elapsed_time: r.elapsed,
            origin: r.origin,
            dest: r.dest,
            op_unique_carrier: carrier,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data: DelayPrediction = await res.json();
        setPredictions((prev) => ({ ...prev, [r.id]: data }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Prediction failed");
      } finally {
        setLoading(false);
      }
    },
    [month, day, dow, depTime, carrier],
  );

  useEffect(() => {
    void scoreRoute(route);
  }, [route.id, scoreRoute]);

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <div className="shrink-0 px-6 pt-8">
        <PageHeader
          title="Flight Delay Predictor"
          subtitle="Live route map with great-circle arcs and delay scoring"
          activeTab="detail"
          detailHref="/delays"
        />
      </div>

      <div className="flex min-h-0 flex-1 gap-0 border-t border-[#E8EAED]">
        {/* Left panel — route list + controls */}
        <aside className="flex w-full max-w-[380px] shrink-0 flex-col border-r border-[#E8EAED] bg-white">
          <div className="border-b border-[#E8EAED] px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#111827]">
                Routes
                <span className="ml-1.5 bg-[#F3F4F6] px-2 py-0.5 text-xs font-medium text-[#6B7280]">
                  {FLIGHT_ROUTES.length}
                </span>
              </h2>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="col-span-2 block text-xs">
                <span className="text-[#6B7280]">Carrier</span>
                <select
                  className="mt-1 w-full border border-[#E8EAED] px-2.5 py-1.5 text-sm"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                >
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs">
                <span className="text-[#6B7280]">Dep (hhmm)</span>
                <input
                  className="mt-1 w-full border border-[#E8EAED] px-2.5 py-1.5 text-sm"
                  value={depTime}
                  onChange={(e) => setDepTime(e.target.value)}
                />
              </label>
              <label className="block text-xs">
                <span className="text-[#6B7280]">Date</span>
                <input
                  type="text"
                  className="mt-1 w-full border border-[#E8EAED] px-2.5 py-1.5 text-sm"
                  value={`${month}/${day}`}
                  onChange={(e) => {
                    const [m, d] = e.target.value.split("/").map(Number);
                    if (m) setMonth(m);
                    if (d) setDay(d);
                  }}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => scoreRoute(route)}
              disabled={loading}
              className="mt-3 w-full bg-[#2563EB] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              {loading ? "Scoring…" : "Re-score selected route"}
            </button>
            {error && <p className="mt-2 text-xs text-[#DC2626]">{error}</p>}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {FLIGHT_ROUTES.map((r, i) => (
              <FlightRouteCard
                key={r.id}
                route={r}
                selected={i === selectedIdx}
                prediction={predictions[r.id] ?? null}
                loading={loading && i === selectedIdx}
                onSelect={() => setSelectedIdx(i)}
              />
            ))}
          </div>

          <div className="border-t border-[#E8EAED] p-4">
            <p className="text-xs font-medium text-[#6B7280]">Model holdout</p>
            <dl className="mt-2 space-y-1.5">
              {metrics.roc_auc != null && (
                <div className="flex justify-between text-xs">
                  <dt className="text-[#6B7280]">ROC-AUC</dt>
                  <dd className="font-medium">{Number(metrics.roc_auc).toFixed(4)}</dd>
                </div>
              )}
              {metrics.delay_mae_minutes != null && (
                <div className="flex justify-between text-xs">
                  <dt className="text-[#6B7280]">Delay MAE</dt>
                  <dd className="font-medium">
                    {Number(metrics.delay_mae_minutes).toFixed(1)} min
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </aside>

        {/* Right panel — map */}
        <div className="min-w-0 flex-1 p-4 bg-[#F7F8FA]">
          <FlightRouteMap route={route} prediction={result} loading={loading} />
        </div>
      </div>
    </div>
  );
}
