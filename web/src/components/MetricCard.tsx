"use client";

import Link from "next/link";
import { Sparkline } from "./Sparkline";

type Trend = { value: string; direction: "up" | "down" | "neutral"; label: string; positiveIsGood?: boolean };

export function MetricCard({ periodLabel, title, heroValue, trend, sparkline, insight, href, status = "live", sparklineFormat = "number" }: {
  periodLabel: string; title: string; heroValue: string; trend?: Trend;
  sparkline?: { date: string; value: number }[]; insight: string; href?: string;
  status?: "live" | "soon"; sparklineFormat?: "percent" | "cycles" | "number";
}) {
  const formatValue = sparklineFormat === "percent" ? (v: number) => `${(v * 100).toFixed(1)}%`
    : sparklineFormat === "cycles" ? (v: number) => `${v.toFixed(0)} cycles`
    : (v: number) => String(v);
  const trendColor = trend ? (trend.direction === "neutral" ? "text-[#6B7280]" : (trend.direction === "up" ? trend.positiveIsGood : !trend.positiveIsGood) ? "text-[#16A34A]" : "text-[#DC2626]") : "";
  const content = (
    <article className="flex h-full flex-col border border-[#E8EAED] bg-white p-6 transition-shadow hover:shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <span className="text-xs font-medium text-[#6B7280]">{periodLabel}</span>
        <span className={`px-2 py-0.5 text-xs font-medium ${status === "soon" ? "bg-[#F3F4F6] text-[#6B7280]" : "bg-[#ECFDF5] text-[#16A34A]"}`}>
          {status === "soon" ? "Coming soon" : "Live"}
        </span>
      </div>
      <h2 className="text-base font-semibold text-[#111827]">{title}</h2>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[#111827]">{heroValue}</p>
      {trend && <p className={`mt-1 text-sm font-medium ${trendColor}`}>{trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.value} <span className="font-normal text-[#6B7280]">{trend.label}</span></p>}
      {sparkline && sparkline.length > 0 && <div className="mt-4"><Sparkline data={sparkline} formatValue={formatValue} /></div>}
      <p className="mt-4 text-sm leading-relaxed text-[#6B7280]" dangerouslySetInnerHTML={{ __html: insight }} />
    </article>
  );
  return href && status === "live" ? <Link href={href} className="block h-full">{content}</Link> : content;
}
