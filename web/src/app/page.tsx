import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { getDashboardSummary } from "@/lib/api";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  const asOf = summary?.as_of ?? new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const delayRate = summary?.delay?.delay_rate ?? 0.21;
  const delayPct = `${(delayRate * 100).toFixed(1)}%`;
  const rocAuc = summary?.delay?.metrics?.roc_auc;
  const avgRul = summary?.engine?.avg_rul_cycles ?? 72;
  const criticalEngines = summary?.engine?.critical_engines ?? 0;
  const engineRmse = summary?.engine?.metrics?.rmse_cycles;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        title="Today's Dispatch Pulse"
        subtitle={`Showing results as of ${asOf}`}
        summary={summary
          ? `Demo fleet delay rate is <strong>${delayPct}</strong> across recent flights. Average predicted engine RUL is <strong>${avgRul.toFixed(0)} cycles</strong> with <strong>${criticalEngines}</strong> engine${criticalEngines === 1 ? "" : "s"} in critical range.`
          : "Start the API on port 8000 to load live metrics."}
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <MetricCard periodLabel="Live model" title="Flight Disruption & Delay Predictor" heroValue={delayPct}
          trend={{ value: summary?.delay?.avg_delay_minutes ? `${summary.delay.avg_delay_minutes.toFixed(0)} min avg` : "—", direction: delayRate > 0.2 ? "up" : "down", label: "when delayed", positiveIsGood: false }}
          sparkline={summary?.delay?.sparkline} sparklineFormat="percent"
          insight={rocAuc ? `ROC-AUC <strong>${rocAuc.toFixed(2)}</strong> on BTS 2024 holdout · Two-stage LightGBM` : "Two-stage LightGBM — delay probability and duration"}
          href="/delays" status="live" />
        <MetricCard periodLabel="Live model" title="Jet Engine Predictive Maintenance" heroValue={`${avgRul.toFixed(0)} cycles`}
          trend={{ value: `${criticalEngines} critical`, direction: criticalEngines > 0 ? "up" : "down", label: "in demo fleet", positiveIsGood: false }}
          sparkline={summary?.engine?.sparkline} sparklineFormat="cycles"
          insight={engineRmse ? `RMSE <strong>${engineRmse.toFixed(1)}</strong> cycles on C-MAPSS demo · Alerts when RUL &lt; 15` : "RUL countdown with critical alerts below 15 cycles"}
          href="/engines" status="live" />
        <MetricCard periodLabel="Phase 2" title="Cargo Weight & Balance Optimization" heroValue="—"
          insight="3D ULD placement within certified CG limits · <strong>PPO/heuristic</strong> bin-packing" status="soon" />
        <MetricCard periodLabel="Phase 3" title="Dynamic Freight Spot-Pricing" heroValue="—"
          insight="Per-kg spot rate forecasting · <strong>Prophet/CatBoost</strong> time-series pipeline" status="soon" />
      </div>
    </div>
  );
}
