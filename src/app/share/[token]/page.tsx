"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import MetricsPanel from "@/components/MetricsPanel";
import PortfolioValueChart from "@/components/PortfolioValueChart";
import AnnualReturnsChart from "@/components/AnnualReturnsChart";
import AllocationChart from "@/components/AllocationChart";
import { TrendingUp, AlertCircle } from "lucide-react";
import type { PortfolioMetrics } from "@/lib/calculations";

interface ShareResponse {
  portfolio: {
    id: string;
    name: string;
    description?: string | null;
    currency: string;
  };
  metrics: PortfolioMetrics;
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("not_found");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("포트폴리오를 찾을 수 없거나 공개되지 않은 포트폴리오입니다."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">포트폴리오 불러오는 중...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-200 mb-2">
            포트폴리오를 찾을 수 없습니다
          </h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const { portfolio, metrics } = data;
  const lastCashValue =
    metrics.monthlyValues.length > 0
      ? metrics.monthlyValues[metrics.monthlyValues.length - 1].cash
      : 0;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* 헤더 */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-blue-400" size={18} />
            <span className="font-bold text-slate-100">invest</span>
            <span className="text-slate-600 text-sm">by nemento</span>
          </div>
          <div className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            읽기 전용 공유 뷰
          </div>
        </div>
      </nav>

      {/* 포트폴리오 헤더 */}
      <div className="border-b border-slate-800 px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-bold text-slate-100">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="text-sm text-slate-400 mt-1">{portfolio.description}</p>
          )}
          <p className="text-xs text-slate-600 mt-1">기준 통화: {portfolio.currency}</p>
        </div>
      </div>

      {/* 본문 */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <MetricsPanel metrics={metrics} currency={portfolio.currency} />

        <Card>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            포트폴리오 가치 추이
          </h3>
          <PortfolioValueChart
            data={metrics.monthlyValues}
            currency={portfolio.currency}
          />
        </Card>

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
              currency={portfolio.currency}
            />
          </Card>
        </div>
      </main>

      <footer className="border-t border-slate-800 px-6 py-4 text-center mt-8">
        <p className="text-xs text-slate-600">
          이 포트폴리오는{" "}
          <a
            href="https://invest.nemento.men"
            className="text-blue-500 hover:underline"
          >
            invest.nemento.men
          </a>
          으로 분석되었습니다.
        </p>
      </footer>
    </div>
  );
}
