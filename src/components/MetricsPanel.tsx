"use client";

import Link from "next/link";
import { Card, CardTitle, CardValue } from "@/components/ui/Card";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import type { PortfolioMetrics } from "@/lib/calculations";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  Activity,
  ArrowDownRight,
  HelpCircle,
} from "lucide-react";

interface MetricsPanelProps {
  metrics: PortfolioMetrics;
  currency: string;
}

function MetricCard({
  title,
  value,
  subvalue,
  icon: Icon,
  positive,
  neutral,
}: {
  title: string;
  value: string;
  subvalue?: string;
  icon: React.ElementType;
  positive?: boolean;
  neutral?: boolean;
}) {
  const color = neutral
    ? "text-slate-100"
    : positive === true
    ? "text-emerald-400"
    : positive === false
    ? "text-red-400"
    : "text-slate-100";

  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <CardTitle>{title}</CardTitle>
        <div className="p-1.5 rounded-lg bg-slate-700/50">
          <Icon size={14} className="text-slate-400" />
        </div>
      </div>
      <CardValue className={color}>{value}</CardValue>
      {subvalue && (
        <p className={`text-sm font-medium ${color}`}>{subvalue}</p>
      )}
    </Card>
  );
}

export default function MetricsPanel({ metrics, currency }: MetricsPanelProps) {
  const gain = metrics.absoluteGain;
  const gainPct = metrics.absoluteGainPct;
  const isPositive = gain >= 0;

  return (
    <div className="space-y-2">
    <div className="flex justify-end">
      <Link
        href="/help"
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <HelpCircle size={12} />
        지표 설명
      </Link>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <MetricCard
        title="현재 가치"
        value={formatCurrency(metrics.currentValue, currency)}
        icon={DollarSign}
        neutral
      />
      <MetricCard
        title="순 투자금"
        value={formatCurrency(metrics.netInvested, currency)}
        subvalue={`입금 ${formatCurrency(metrics.totalInvested, currency)}`}
        icon={DollarSign}
        neutral
      />
      <MetricCard
        title="평가 손익"
        value={formatCurrency(gain, currency)}
        subvalue={formatPercent(gainPct)}
        icon={isPositive ? TrendingUp : TrendingDown}
        positive={isPositive}
      />
      <MetricCard
        title="CAGR"
        value={
          metrics.cagr !== null
            ? formatPercent(metrics.cagr)
            : "—"
        }
        subvalue="연환산 수익률 (TWR)"
        icon={TrendingUp}
        positive={metrics.cagr !== null ? metrics.cagr >= 0 : undefined}
      />
      <MetricCard
        title="IRR"
        value={
          metrics.irr !== null
            ? formatPercent(metrics.irr)
            : "—"
        }
        subvalue="금액가중 수익률"
        icon={BarChart2}
        positive={metrics.irr !== null ? metrics.irr >= 0 : undefined}
      />
      <MetricCard
        title="Sharpe Ratio"
        value={
          metrics.sharpeRatio !== null
            ? formatNumber(metrics.sharpeRatio, 2)
            : "—"
        }
        subvalue={
          metrics.sharpeRatio !== null
            ? metrics.sharpeRatio >= 1
              ? "우수 (≥1)"
              : metrics.sharpeRatio >= 0
              ? "보통 (0~1)"
              : "저조 (<0)"
            : "데이터 부족"
        }
        icon={Activity}
        positive={
          metrics.sharpeRatio !== null
            ? metrics.sharpeRatio >= 0
            : undefined
        }
      />
      <MetricCard
        title="최대 낙폭"
        value={formatPercent(metrics.maxDrawdown)}
        subvalue="Max Drawdown"
        icon={ArrowDownRight}
        positive={false}
      />
    </div>
    </div>
  );
}
