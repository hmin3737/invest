"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AllocationItem } from "@/lib/calculations";
import { formatCurrency, formatNumber } from "@/lib/utils";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

interface AllocationChartProps {
  allocation: AllocationItem[];
  cashValue: number;
  cashPct: number;
  currency: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, currency }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
      <p className="text-sm font-semibold text-slate-100">{d.name}</p>
      <p className="text-xs text-slate-400">
        {formatCurrency(d.value, currency)}
      </p>
      <p className="text-xs text-slate-400">
        {formatNumber(d.payload.percent, 1)}%
      </p>
    </div>
  );
}

export default function AllocationChart({
  allocation,
  cashValue,
  cashPct,
  currency,
}: AllocationChartProps) {
  const data = [
    ...allocation.map((a) => ({
      name: a.ticker,
      value: Math.round(a.value),
      percent: a.percent,
    })),
  ];

  if (cashValue > 0) {
    data.push({
      name: "현금",
      value: Math.round(cashValue),
      percent: cashPct,
    });
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        보유 자산 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            dataKey="value"
            paddingAngle={2}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={COLORS[index % COLORS.length]}
                opacity={0.9}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-slate-400">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-2 space-y-1.5">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="text-slate-400">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-300 tabular-nums">
                {formatCurrency(item.value, currency)}
              </span>
              <span className="text-slate-500 tabular-nums w-12 text-right">
                {formatNumber(item.percent, 1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
