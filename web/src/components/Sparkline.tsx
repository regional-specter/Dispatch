"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function Sparkline({ data, color = "#2563EB", formatValue = (v: number) => String(v) }: {
  data: { date: string; value: number }[];
  color?: string;
  formatValue?: (v: number) => string;
}) {
  if (!data.length) return <div className="flex h-24 items-center justify-center text-xs text-[#6B7280]">No trend data</div>;
  return (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} interval="preserveStartEnd"
            tickFormatter={(v: string) => v.startsWith("Cycle") ? v.replace("Cycle ", "C") : new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ border: "1px solid #E8EAED", borderRadius: 8, fontSize: 12 }} formatter={(v) => [formatValue(Number(v)), ""]} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#sparkFill)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
