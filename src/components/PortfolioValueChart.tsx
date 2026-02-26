"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyValue } from "@/lib/calculations";
import { formatCurrency } from "@/lib/utils";

interface PortfolioValueChartProps {
  data: MonthlyValue[];
  currency: string;
}

function formatAxisValue(value: number, currency: string): string {
  if (currency === "KRW") {
    if (value >= 1e8) return `${(value / 1e8).toFixed(1)}억`;
    if (value >= 1e4) return `${(value / 1e4).toFixed(0)}만`;
    return value.toLocaleString();
  }
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-100">
        {formatCurrency(payload[0].value, currency)}
      </p>
      {payload[1] && (
        <p className="text-xs text-blue-400">
          주식: {formatCurrency(payload[1].value, currency)}
        </p>
      )}
      {payload[2] && (
        <p className="text-xs text-emerald-400">
          현금: {formatCurrency(payload[2].value, currency)}
        </p>
      )}
    </div>
  );
}

export default function PortfolioValueChart({
  data,
  currency,
}: PortfolioValueChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        거래 내역을 추가하면 차트가 표시됩니다.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date,
    value: Math.round(d.value),
    stock: Math.round(d.stockValue),
    cash: Math.round(d.cash),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatAxisValue(v, currency)}
          width={70}
        />
        <Tooltip
          content={<CustomTooltip currency={currency} />}
          cursor={{ stroke: "#475569", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#colorValue)"
          dot={false}
          activeDot={{ r: 4, fill: "#3b82f6" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
