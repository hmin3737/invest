"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import TransactionForm from "@/components/TransactionForm";
import TransactionTable from "@/components/TransactionTable";
import ImportModal from "@/components/ImportModal";
import { TrendingUp, Plus, ArrowLeft, BarChart3, Settings, Share2, Eye, EyeOff, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import Input from "@/components/ui/Input";

interface Portfolio {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  isPublic: boolean;
  shareTransactions: boolean;
  shareToken: string;
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
}

export default function EditPortfolioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddTx, setShowAddTx] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch: watchSettings, formState: { isSubmitting } } = useForm({
    defaultValues: { name: "", description: "", isPublic: false, shareTransactions: false },
  });
  const watchIsPublic = watchSettings("isPublic");

  const fetchPortfolio = async () => {
    const res = await fetch(`/api/portfolios/${id}`);
    if (res.status === 401) { router.push("/"); return; }
    if (!res.ok) { router.push("/dashboard"); return; }
    const data = await res.json();
    setPortfolio(data);
    reset({
      name: data.name,
      description: data.description || "",
      isPublic: data.isPublic,
      shareTransactions: data.shareTransactions,
    });
    setLoading(false);
  };

  useEffect(() => { fetchPortfolio(); }, [id]); // eslint-disable-line

  const handleSettingsSave = async (data: { name: string; description: string; isPublic: boolean; shareTransactions: boolean }) => {
    await fetch(`/api/portfolios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setShowSettings(false);
    fetchPortfolio();
  };

  const handleShare = () => {
    if (!portfolio) return;
    const url = `${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/share/${portfolio.shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareMsg("공유 링크가 복사되었습니다!");
      setTimeout(() => setShareMsg(null), 2500);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm">로딩 중...</div>
      </div>
    );
  }

  if (!portfolio) return null;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* 헤더 */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-100 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-400" size={18} />
              <span className="font-semibold text-slate-100">{portfolio.name}</span>
              <span className="text-slate-600 text-sm">편집</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {shareMsg && (
              <span className="text-xs text-emerald-400 animate-fade-in">{shareMsg}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              disabled={!portfolio.isPublic}
              title={!portfolio.isPublic ? "공유하려면 설정에서 공개로 변경하세요" : "공유 링크 복사"}
            >
              <Share2 size={14} />
              공유
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowSettings(true)}>
              <Settings size={14} />
              설정
            </Button>
            <Link href={`/portfolio/${id}`}>
              <Button variant="primary" size="sm">
                <BarChart3 size={14} />
                분석 보기
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* 본문 */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">거래 내역</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {portfolio.transactions.length}개의 거래 · {portfolio.currency}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              <Upload size={15} />
              엑셀 가져오기
            </Button>
            <Button onClick={() => setShowAddTx(true)}>
              <Plus size={15} />
              거래 추가
            </Button>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
          <TransactionTable
            transactions={portfolio.transactions}
            portfolioId={id}
            currency={portfolio.currency}
            onRefresh={fetchPortfolio}
          />
        </div>
      </main>

      {/* 거래 추가 모달 */}
      <Modal
        open={showAddTx}
        onClose={() => setShowAddTx(false)}
        title="거래 추가"
      >
        <TransactionForm
          portfolioId={id}
          portfolioCurrency={portfolio.currency}
          onSuccess={() => {
            setShowAddTx(false);
            fetchPortfolio();
          }}
        />
      </Modal>

      {/* 엑셀 가져오기 모달 */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        portfolioId={id}
        onSuccess={fetchPortfolio}
      />

      {/* 설정 모달 */}
      <Modal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="포트폴리오 설정"
      >
        <form onSubmit={handleSubmit(handleSettingsSave)} className="space-y-4">
          <Input label="포트폴리오 이름" {...register("name")} />
          <Input label="설명 (선택)" {...register("description")} />

          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/50 border border-slate-600">
            <div>
              <p className="text-sm font-medium text-slate-200">공개 공유</p>
              <p className="text-xs text-slate-500 mt-0.5">
                활성화하면 공유 링크로 누구나 볼 수 있습니다.
              </p>
            </div>
            <label className="relative cursor-pointer">
              <input
                type="checkbox"
                {...register("isPublic")}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-600 rounded-full peer peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>

          {/* 거래내역 공유 토글 (공개 상태일 때만 의미 있음) */}
          {watchIsPublic && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/50 border border-slate-600">
              <div>
                <p className="text-sm font-medium text-slate-200">거래내역 공개</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  공유 링크 접속자에게 거래 내역 테이블도 보여줍니다.
                </p>
              </div>
              <label className="relative cursor-pointer">
                <input
                  type="checkbox"
                  {...register("shareTransactions")}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-600 rounded-full peer peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          )}

          {watchIsPublic ? (
            <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600">
              <div className="flex items-center gap-2 mb-1">
                <Eye size={12} className="text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">공개 중</span>
              </div>
              <p className="text-xs text-slate-500 break-all">
                {`${process.env.NEXT_PUBLIC_BASE_URL || ""}/share/${portfolio.shareToken}`}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <EyeOff size={12} />
              현재 비공개 상태입니다.
            </div>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full">
            저장
          </Button>
        </form>
      </Modal>
    </div>
  );
}
