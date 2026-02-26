"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { TrendingUp, Plus, LogOut, BarChart3, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDate } from "@/lib/utils";

const portfolioSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요."),
  description: z.string().optional(),
  currency: z.enum(["KRW", "USD"]),
});

type PortfolioFormData = z.infer<typeof portfolioSchema>;

interface Portfolio {
  id: string;
  name: string;
  description?: string;
  currency: string;
  isPublic: boolean;
  updatedAt: string;
  _count: { transactions: number };
}

export default function DashboardPage() {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const watchCurrency = watch("currency");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PortfolioFormData>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: { currency: "KRW" },
  });

  const fetchPortfolios = async () => {
    const res = await fetch("/api/portfolios");
    if (res.status === 401) {
      router.push("/");
      return;
    }
    const data = await res.json();
    setPortfolios(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPortfolios();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const handleCreate = async (data: PortfolioFormData) => {
    const res = await fetch("/api/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const portfolio = await res.json();
      setShowCreate(false);
      reset();
      router.push(`/portfolio/${portfolio.id}/edit`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 포트폴리오를 삭제하시겠습니까? 모든 거래 내역이 삭제됩니다.`)) return;
    setDeletingId(id);
    await fetch(`/api/portfolios/${id}`, { method: "DELETE" });
    setDeletingId(null);
    fetchPortfolios();
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* 헤더 */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <TrendingUp className="text-blue-400" size={20} />
            <span className="font-bold text-slate-100">invest</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-400"
          >
            <LogOut size={15} />
            로그아웃
          </Button>
        </div>
      </nav>

      {/* 본문 */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">내 포트폴리오</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {portfolios.length}개의 포트폴리오
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            새 포트폴리오
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-xl bg-slate-800/50 animate-pulse"
              />
            ))}
          </div>
        ) : portfolios.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <BarChart3 size={24} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-1">
              포트폴리오가 없습니다
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              첫 번째 포트폴리오를 만들어 투자를 분석해보세요.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} />
              포트폴리오 만들기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolios.map((p) => (
              <Card
                key={p.id}
                className="group hover:border-slate-600 transition-colors cursor-pointer"
              >
                <Link href={`/portfolio/${p.id}`} className="block">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-100 group-hover:text-blue-300 transition-colors">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {p.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-600 bg-slate-700/50 px-2 py-0.5 rounded">
                      {p.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{p._count.transactions}개 거래</span>
                    <span>{formatDate(p.updatedAt)} 수정</span>
                  </div>
                </Link>
                <div className="flex gap-1 mt-3 pt-3 border-t border-slate-700/50">
                  <Link
                    href={`/portfolio/${p.id}/edit`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    <Pencil size={11} />
                    편집
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(p.id, p.name);
                    }}
                    disabled={deletingId === p.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
                  >
                    <Trash2 size={11} />
                    삭제
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 포트폴리오 생성 모달 */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); reset(); }}
        title="새 포트폴리오 만들기"
      >
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
          <Input
            label="포트폴리오 이름"
            placeholder="예: 성장주 포트폴리오"
            {...register("name")}
            error={errors.name?.message}
          />
          <Input
            label="설명 (선택)"
            placeholder="포트폴리오에 대한 간단한 설명"
            {...register("description")}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">기준 통화</label>
            <div className="grid grid-cols-2 gap-2">
              {(["KRW", "USD"] as const).map((c) => (
                <label
                  key={c}
                  className="cursor-pointer"
                >
                  <input type="radio" value={c} {...register("currency")} className="sr-only" />
                  <div className={`text-center py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                    watchCurrency === c
                      ? "bg-blue-500/20 border-blue-500/60 text-blue-300"
                      : "border-slate-600 text-slate-400 hover:border-slate-500"
                  }`}>
                    {c === "KRW" ? "🇰🇷 원화 (KRW)" : "🇺🇸 달러 (USD)"}
                  </div>
                </label>
              ))}
            </div>
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">
            포트폴리오 만들기
          </Button>
        </form>
      </Modal>
    </div>
  );
}
