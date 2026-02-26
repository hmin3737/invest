"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { TrendingUp, BarChart2, Shield, Zap } from "lucide-react";

const schema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요."),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다."),
});

type FormData = z.infer<typeof schema>;

export default function HomePage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error || "오류가 발생했습니다.");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      {/* 상단 네비 */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <TrendingUp className="text-blue-400" size={22} />
          <span className="text-lg font-bold text-slate-100">invest</span>
          <span className="text-slate-500 text-sm ml-1">by nemento</span>
        </div>
      </nav>

      {/* 히어로 */}
      <section className="flex-1 flex flex-col lg:flex-row items-center max-w-6xl mx-auto w-full px-6 py-12 gap-12">
        {/* 왼쪽: 설명 */}
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
            <Zap size={12} />
            현금흐름 반영 정밀 분석
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-slate-100 leading-tight">
            당신의 투자,
            <br />
            <span className="text-blue-400">정확하게</span> 분석하세요
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed">
            중간 입출금이 있어도 정확한 수익률을 계산합니다.
            CAGR, IRR, Sharpe Ratio 등 전문 투자 지표를 한눈에.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {[
              {
                icon: BarChart2,
                title: "TWR · IRR 수익률",
                desc: "현금흐름을 반영한 두 가지 수익률",
              },
              {
                icon: Shield,
                title: "Sharpe Ratio",
                desc: "위험 대비 수익을 정량화",
              },
              {
                icon: TrendingUp,
                title: "포트폴리오 공유",
                desc: "링크 하나로 성과를 자랑하세요",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50"
              >
                <div className="p-2 rounded-lg bg-blue-500/10 w-fit mb-3">
                  <Icon size={16} className="text-blue-400" />
                </div>
                <p className="text-sm font-medium text-slate-200">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽: 로그인/회원가입 카드 */}
        <div className="w-full max-w-sm">
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 backdrop-blur-sm">
            {/* 탭 */}
            <div className="flex rounded-lg bg-slate-700/50 p-1 mb-6">
              {(["login", "register"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setServerError(null);
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    tab === t
                      ? "bg-slate-600 text-slate-100"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t === "login" ? "로그인" : "회원가입"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="이메일"
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                {...register("email")}
                error={errors.email?.message}
              />
              <Input
                label="비밀번호"
                type="password"
                placeholder="6자 이상"
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                {...register("password")}
                error={errors.password?.message}
              />

              {serverError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {serverError}
                </div>
              )}

              <Button
                type="submit"
                loading={isSubmitting}
                className="w-full mt-2"
                size="lg"
              >
                {tab === "login" ? "로그인" : "계정 만들기"}
              </Button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-4">
              포트폴리오는 암호화된 비밀번호로 보호됩니다.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 px-6 py-4 text-center">
        <p className="text-xs text-slate-600">
          © 2025 invest.nemento.men — Yahoo Finance 가격 데이터 사용
        </p>
      </footer>
    </main>
  );
}
