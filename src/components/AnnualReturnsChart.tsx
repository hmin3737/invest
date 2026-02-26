"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { AnnualReturn } from "@/lib/calculations";
import { formatPercent } from "@/lib/utils";

interface AnnualReturnsChartProps {
  data: AnnualReturn[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0].value;
  const isPos = value >= 0;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}년</p>
      <p
        className={`text-sm font-semibold ${
          isPos ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {formatPercent(value / 100)}
      </p>
    </div>
  );
}

export default function AnnualReturnsChart({ data }: AnnualReturnsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        연간 수익률 데이터가 없습니다.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    year: d.year,
    return: parseFloat((d.return * 100).toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: "#64748b", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.05)" }} />
        <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
        <Bar dataKey="return" radius={[4, 4, 0, 0]} maxBarSize={60}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.return >= 0 ? "#10b981" : "#ef4444"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
