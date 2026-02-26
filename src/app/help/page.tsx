"use client";

import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      {children}
    </section>
  );
}

function Formula({ children }: { children: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-blue-300 leading-relaxed overflow-x-auto">
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400 leading-relaxed">{children}</p>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-semibold text-slate-200">{children}</span>
  );
}

function Tag({ color, children }: { color: string; children: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {children}
    </span>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* 헤더 */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-100 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-400" size={18} />
              <span className="font-bold text-slate-100">지표 설명</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* TOC */}
        <nav className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">목차</p>
          <ul className="space-y-1.5 text-sm">
            {[
              ["#cagr", "CAGR — 연환산 수익률 (TWR 기반)"],
              ["#irr", "IRR — 내부수익률 (금액가중수익률)"],
              ["#annual", "연도별 수익률"],
              ["#sharpe", "Sharpe Ratio"],
              ["#mdd", "Max Drawdown (최대 낙폭)"],
              ["#gain", "평가 손익 / 순 투자금"],
              ["#value", "포트폴리오 가치 계산 방법"],
              ["#datasource", "데이터 소스"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="text-blue-400 hover:text-blue-300 hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* CAGR */}
        <Section id="cagr" title="CAGR — 연환산 수익률 (TWR 기반)">
          <P>
            <Label>CAGR(Compound Annual Growth Rate)</Label>는 포트폴리오의 연환산 복리 성장률입니다.
            여기서는 <Label>TWR(Time-Weighted Return, 시간가중수익률)</Label> 방식으로 계산합니다.
          </P>
          <P>
            TWR의 핵심은 <Label>현금 입출금의 타이밍 영향을 제거</Label>하는 것입니다.
            큰 금액을 입금하거나 출금해도 투자 성과 자체는 왜곡되지 않습니다.
            펀드 매니저 성과 평가에 사용하는 국제 표준(CFA) 방식입니다.
          </P>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">계산 방식 (Modified Dietz 월별 근사)</p>
            <Formula>{"월별_수익률[i] = (월말가치[i] − 해당월_순현금흐름[i]) / 전월말가치[i]"}</Formula>
            <Formula>{"TWR = ∏(1 + 월별_수익률[i]) − 1  (모든 월 곱셈)"}</Formula>
            <Formula>{"CAGR = (1 + TWR)^(1 / 투자기간_년수) − 1"}</Formula>
          </div>
          <P>
            <Label>순현금흐름</Label>이란 해당 월의 입금(CASH_IN) 합계에서 출금(CASH_OUT) 합계를 뺀 값입니다.
            예: 당월 100만원 입금 + 주식 가치가 5% 상승 → 월별 수익률은 5%만 반영됩니다.
          </P>
          <div className="bg-slate-800/40 rounded-lg p-4 text-sm text-slate-400 space-y-1">
            <p className="text-slate-300 font-medium text-xs uppercase tracking-wider mb-2">해석 가이드</p>
            <p><Tag color="bg-emerald-500/20 text-emerald-300">10% 이상</Tag> 우수한 장기 성과 (S&P 500 역사적 평균 약 10%)</p>
            <p><Tag color="bg-blue-500/20 text-blue-300">5–10%</Tag> 양호</p>
            <p><Tag color="bg-slate-600/50 text-slate-400">0–5%</Tag> 인플레이션 수준 또는 그 이상</p>
            <p><Tag color="bg-red-500/20 text-red-300">0% 미만</Tag> 원금 손실 구간</p>
          </div>
        </Section>

        {/* IRR */}
        <Section id="irr" title="IRR — 내부수익률 (금액가중수익률)">
          <P>
            <Label>IRR(Internal Rate of Return)</Label>은 모든 현금흐름의 현재가치(NPV)를 0으로 만드는 할인율입니다.
            <Label>MWR(Money-Weighted Return, 금액가중수익률)</Label>이라고도 합니다.
          </P>
          <P>
            TWR과 달리 투자 타이밍이 중요합니다. 시장이 좋을 때 많이 투자했다면 IRR이 높아지고,
            나쁠 때 많이 투자했다면 낮아집니다. 따라서 <Label>실제 투자자 경험을 더 잘 반영</Label>합니다.
          </P>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">계산 방식</p>
            <Formula>{"NPV = Σ CF[t] / (1+IRR)^t = 0 을 만족하는 IRR을 Newton's method로 탐색"}</Formula>
            <Formula>{"현금흐름: CASH_IN → 음수 (지출), CASH_OUT → 양수 (수입)"}</Formula>
            <Formula>{"마지막 현금흐름: 현재 포트폴리오 총가치 (양수)"}</Formula>
          </div>
          <P>
            CAGR(TWR)과 IRR의 차이가 클수록 현금흐름 타이밍이 수익률에 큰 영향을 미친 것입니다.
          </P>
        </Section>

        {/* Annual Returns */}
        <Section id="annual" title="연도별 수익률">
          <P>
            각 연도의 투자 성과를 TWR 방식으로 계산합니다.
            해당 연도 내의 월별 Modified Dietz 수익률을 chain-link(곱) 합니다.
          </P>
          <Formula>{"연도별_수익률 = ∏(1 + 월별_수익률[i]) − 1  (해당 연도 내 모든 월)"}</Formula>
          <P>
            막대그래프에서 초록색은 양(+)의 수익률, 빨간색은 음(-)의 수익률을 나타냅니다.
            첫 해는 포트폴리오 시작 시점부터 연말까지만 계산됩니다.
          </P>
        </Section>

        {/* Sharpe */}
        <Section id="sharpe" title="Sharpe Ratio">
          <P>
            <Label>샤프 비율</Label>은 단위 위험당 초과수익률로, 위험 조정 성과를 나타냅니다.
            수익률이 같다면 변동성이 낮을수록 Sharpe가 높습니다.
          </P>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">계산 방식</p>
            <Formula>{"초과수익률[i] = 월별_수익률[i] − 무위험수익률 (= 연4% / 12 = 0.333%/월)"}</Formula>
            <Formula>{"Sharpe = (평균_초과수익률 / 표준편차) × √12  (연환산)"}</Formula>
          </div>
          <P>
            무위험수익률로 <Label>연 4%</Label>를 사용합니다 (미국 단기국채 수익률 근사치).
            최소 6개월 이상의 데이터가 있어야 계산됩니다.
          </P>
          <div className="bg-slate-800/40 rounded-lg p-4 text-sm text-slate-400 space-y-1">
            <p className="text-slate-300 font-medium text-xs uppercase tracking-wider mb-2">해석 가이드</p>
            <p><Tag color="bg-emerald-500/20 text-emerald-300">≥ 1</Tag> 우수 — 위험 대비 충분한 보상</p>
            <p><Tag color="bg-blue-500/20 text-blue-300">0 ~ 1</Tag> 보통 — 어느 정도 보상 있음</p>
            <p><Tag color="bg-red-500/20 text-red-300">&lt; 0</Tag> 저조 — 무위험자산보다 못함</p>
          </div>
        </Section>

        {/* MDD */}
        <Section id="mdd" title="Max Drawdown (최대 낙폭)">
          <P>
            <Label>최대 낙폭(MDD)</Label>은 고점 대비 최대 하락폭입니다.
            포트폴리오 가치가 얼마나 크게 떨어질 수 있는지를 나타내는 위험 지표입니다.
          </P>
          <Formula>{"MDD = min( (V[i] − peak[i]) / peak[i] )  ← peak[i]는 i 시점까지의 최고가치"}</Formula>
          <P>
            음수로 표시됩니다. 예: -25%는 고점 대비 최대 25% 하락이 있었다는 의미입니다.
            절댓값이 작을수록 안정적인 포트폴리오입니다.
          </P>
        </Section>

        {/* Gain */}
        <Section id="gain" title="평가 손익 / 순 투자금">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-300 mb-1">순 투자금</p>
              <Formula>{"순 투자금 = 누적 입금(CASH_IN) − 누적 출금(CASH_OUT)"}</Formula>
              <P>거래 타이밍과 무관하게 포트폴리오에 실제로 넣어둔 금액의 합계입니다.</P>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300 mb-1">평가 손익</p>
              <Formula>{"평가 손익 = 현재 가치 − 순 투자금"}</Formula>
              <Formula>{"평가 수익률 = 평가 손익 / 순 투자금"}</Formula>
              <P>
                단순 절대 수익률입니다. 투자 기간이나 현금흐름 타이밍을 반영하지 않으므로,
                성과 비교에는 CAGR이나 IRR을 사용하는 것이 더 정확합니다.
              </P>
            </div>
          </div>
        </Section>

        {/* Portfolio Value */}
        <Section id="value" title="포트폴리오 가치 계산 방법">
          <P>
            매월 말 기준으로 포트폴리오 가치를 계산합니다.
          </P>
          <Formula>{"월별 가치 = 현금 잔고 + 주식 평가액"}</Formula>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">각 항목 계산</p>
            <Formula>{"현금 잔고 = Σ CASH_IN − Σ CASH_OUT − Σ BUY총금액 + Σ SELL총금액 + Σ DIVIDEND"}</Formula>
            <Formula>{"주식 평가액 = Σ (보유수량 × 해당월 종가)"}</Formula>
          </div>
          <P>
            KRW 포트폴리오에 USD 종목이 있으면, 해당 월의 USD/KRW 환율로 환산합니다.
            환율 데이터는 Yahoo Finance의 USDKRW=X에서 월별 종가를 사용합니다.
          </P>
        </Section>

        {/* Data source */}
        <Section id="datasource" title="데이터 소스">
          <div className="space-y-3 text-sm text-slate-400">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <span className="text-slate-300 font-medium">주가 데이터</span>
              <span>Yahoo Finance (무료 API, 수정 주가 사용)</span>
              <span className="text-slate-300 font-medium">환율 데이터</span>
              <span>Yahoo Finance USDKRW=X (Reuters/Refinitiv 제공, 서울외국환중개 고시환율과 1–2원 이내 차이)</span>
              <span className="text-slate-300 font-medium">가격 조회 간격</span>
              <span>지표 계산: 월별 종가 (adjclose 우선). 거래 입력 시 자동 조회: 해당일 일별 가격</span>
              <span className="text-slate-300 font-medium">주의사항</span>
              <span>상장폐지된 종목은 Yahoo Finance에서 과거 데이터도 조회 불가. 해당 종목은 가격 0으로 처리됩니다.</span>
            </div>
          </div>
        </Section>

        <div className="text-center py-4">
          <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
            ← 대시보드로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
