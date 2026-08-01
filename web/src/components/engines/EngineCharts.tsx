"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EngineTelemetry, RulTimelinePoint } from "@/lib/api";

type EngineChartsProps = {
  telemetry: EngineTelemetry | null;
  rulTimeline: RulTimelinePoint[];
  loading: boolean;
};

export function EngineCharts({ telemetry, rulTimeline, loading }: EngineChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="border border-[#E8EAED] bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
          RUL degradation curve
        </p>
        <p className="mt-0.5 text-xs text-[#9CA3AF]">Predicted remaining cycles over engine life</p>
        <div className="mt-3 h-44">
          {loading || !rulTimeline.length ? (
            <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="flight-spinner" /> Loading…
                </span>
              ) : (
                "No timeline data"
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rulTimeline} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rulFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="cycle"
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "Cycle", position: "insideBottom", offset: -2, fontSize: 10, fill: "#9CA3AF" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{ border: "1px solid #E8EAED", fontSize: 12 }}
                  formatter={(v) => [`${Number(v).toFixed(1)} cycles`, "RUL"]}
                />
                <Area
                  type="monotone"
                  dataKey="rul"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#rulFill)"
                  dot={false}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="border border-[#E8EAED] bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">
          Core temperature trend
        </p>
        <p className="mt-0.5 text-xs text-[#9CA3AF]">HPC outlet temp (s4) · rolling window</p>
        <div className="mt-3 h-44">
          {loading || !telemetry?.series.length ? (
            <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="flight-spinner" /> Loading…
                </span>
              ) : (
                "No telemetry"
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetry.series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="cycle"
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{ border: "1px solid #E8EAED", fontSize: 12 }}
                  formatter={(v) => [Number(v).toFixed(3), "s4"]}
                />
                <Line
                  type="monotone"
                  dataKey="s4"
                  stroke="#D97706"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={800}
                />
                <Line
                  type="monotone"
                  dataKey="s7"
                  stroke="#2563EB"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 3"
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export function CycleScrubber({
  min,
  max,
  value,
  onChange,
  disabled,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="border border-[#E8EAED] bg-white p-4">
      <div className="flex items-center justify-between text-xs text-[#6B7280]">
        <span>Cycle replay</span>
        <span className="font-semibold tabular-nums text-[#111827]">
          {value} <span className="font-normal text-[#6B7280]">/ {max}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="engine-scrubber mt-3 w-full"
      />
      <div className="mt-1 flex justify-between text-[10px] text-[#9CA3AF]">
        <span>Cycle {min}</span>
        <span>Latest</span>
      </div>
    </div>
  );
}
