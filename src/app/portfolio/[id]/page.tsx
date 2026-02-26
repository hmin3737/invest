"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import MetricsPanel from "@/components/MetricsPanel";
import PortfolioValueChart from "@/components/PortfolioValueChart";
import AnnualReturnsChart from "@/components/AnnualReturnsChart";
import AllocationChart from "@/components/AllocationChart";
import TransactionTable from "@/components/TransactionTable";
import {
  TrendingUp,
  ArrowLeft,
  Pencil,
  Share2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import type { PortfolioMetrics } from "@/lib/calculations";

interface MetricsResponse {
  portfolio: {
    id: string;
    name: string;
    description?: string | null;
    currency: string;
    shareToken: string;
    isPublic: boolean;
  };
  metrics: PortfolioMetrics;
}

interface Portfolio {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  shareToken: string;
  isPublic: boolean;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  date: string;
  type: string;
  ticker?: string | null;
  tickerName?: string | null;
  quantity?: number | null;
  price?: number | null;
  totalAmount: number;
  priceType: string;
  notes?: string | null;
  txCurrency?: string | null;
}

export default function PortfolioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [txExpanded, setTxExpanded] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, portfolioRes] = await Promise.all([
        fetch(`/api/metrics/${id}`),
        fetch(`/api/portfolios/${id}`),
      ]);

      if (metricsRes.status === 401) { router.push("/"); return; }

      const [metricsData, portfolioData] = await Promise.all([
        metricsRes.json(),
        portfolioRes.json(),
      ]);

      setData(metricsData);
      setPortfolio(portfolioData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]); // eslint-disable-line

  const handleShare = () => {
    if (!data?.portfolio) return;
    const url = `${window.location.origin}/share/${data.portfolio.shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareMsg("공유 링크가 복사되었습니다!");
      setTimeout(() => setShareMsg(null), 2500);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">포트폴리오 분석 중...</p>
        <p className="text-slate-600 text-xs">Yahoo Finance에서 가격 데이터를 가져오고 있습니다</p>
      </div>
    );
  }

  if (!data || !portfolio) return null;

  const { metrics } = data;
  const lastCashValue =
    metrics.monthlyValues.length > 0
      ? metrics.monthlyValues[metrics.monthlyValues.length - 1].cash
      : 0;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* 헤더 */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-100 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-400" size={18} />
              <span className="font-semibold text-slate-100">
                {data.portfolio.name}
              </span>
              {data.portfolio.description && (
                <span className="text-slate-600 text-sm hidden sm:inline">
                  — {data.portfolio.description}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {shareMsg && (
              <span className="text-xs text-emerald-400">{shareMsg}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              title="새로고침"
            >
              <RefreshCw size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              disabled={!data.portfolio.isPublic}
              title={!data.portfolio.isPublic ? "설정에서 공개로 변경 후 공유 가능" : "공유 링크 복사"}
            >
              <Share2 size={14} />
              공유
            </Button>
            <Link href={`/portfolio/${id}/edit`}>
              <Button variant="secondary" size="sm">
                <Pencil size={14} />
                편집
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* 본문 */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* 지표 패널 */}
        <MetricsPanel metrics={metrics} currency={data.portfolio.currency} />

        {/* 포트폴리오 가치 차트 */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            포트폴리오 가치 추이
          </h3>
          <PortfolioValueChart
            data={metrics.monthlyValues}
            currency={data.portfolio.currency}
          />
        </Card>

        {/* 연도별 수익률 & 자산 배분 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">
              연도별 수익률
            </h3>
            <AnnualReturnsChart data={metrics.annualReturns} />
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-slate-300 mb-4">
              현재 자산 배분
            </h3>
            <AllocationChart
              allocation={metrics.allocation}
              cashValue={lastCashValue}
              cashPct={metrics.cashPct}
              currency={data.portfolio.currency}
            />
          </Card>
        </div>

        {/* 거래 내역 (접을 수 있음) */}
        <Card padding="none">
          <button
            onClick={() => setTxExpanded(!txExpanded)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-700/20 transition-colors rounded-xl"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-300">거래 내역</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {portfolio.transactions.length}개
              </p>
            </div>
            {txExpanded ? (
              <ChevronUp size={16} className="text-slate-500" />
            ) : (
              <ChevronDown size={16} className="text-slate-500" />
            )}
          </button>
          {txExpanded && (
            <div className="border-t border-slate-700/50 px-5 pb-5">
              <TransactionTable
                transactions={portfolio.transactions}
                portfolioId={id}
                currency={portfolio.currency}
                onRefresh={fetchData}
              />
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
