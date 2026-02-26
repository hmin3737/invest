import { getMonthlyPrices, getMonthlyExchangeRates, inferTickerCurrency } from "./yahoo";

export type TransactionType =
  | "BUY"
  | "SELL"
  | "CASH_IN"
  | "CASH_OUT"
  | "DIVIDEND";

export interface Transaction {
  id: string;
  date: Date;
  type: TransactionType;
  ticker?: string | null;
  tickerName?: string | null;
  quantity?: number | null;
  price?: number | null;
  totalAmount: number;
}

export interface MonthlyValue {
  date: string; // YYYY-MM
  value: number;
  cash: number;
  stockValue: number;
}

export interface AnnualReturn {
  year: number;
  return: number; // 소수점 (0.15 = 15%)
  startValue: number;
  endValue: number;
}

export interface AllocationItem {
  ticker: string;
  name: string;
  value: number;
  quantity: number;
  percent: number;
}

export interface PortfolioMetrics {
  currentValue: number;
  totalInvested: number;     // 누적 CASH_IN
  totalWithdrawn: number;    // 누적 CASH_OUT
  netInvested: number;       // totalInvested - totalWithdrawn
  absoluteGain: number;      // currentValue - netInvested
  absoluteGainPct: number;   // absoluteGain / netInvested
  cagr: number | null;       // TWR 기반 연환산 수익률
  irr: number | null;        // 내부수익률 (금액가중)
  sharpeRatio: number | null;
  maxDrawdown: number;       // 최대 낙폭 (음수)
  monthlyValues: MonthlyValue[];
  annualReturns: AnnualReturn[];
  allocation: AllocationItem[];
  cashPct: number;
}

/**
 * 포트폴리오의 모든 지표를 계산합니다.
 */
export async function calculatePortfolioMetrics(
  transactions: Transaction[],
  portfolioCurrency: string = "KRW"
): Promise<PortfolioMetrics> {
  if (transactions.length === 0) {
    return emptyMetrics();
  }

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const startDate = new Date(sorted[0].date);
  const endDate = new Date();

  // 고유 티커 수집
  const tickers = Array.from(
    new Set(sorted.filter((t) => t.ticker).map((t) => t.ticker!))
  );

  // Yahoo Finance에서 월별 가격 일괄 조회
  const priceData: Record<string, Record<string, number>> = {};
  await Promise.all(
    tickers.map(async (ticker) => {
      const prices = await getMonthlyPrices(ticker, startDate, endDate);
      priceData[ticker] = prices;
    })
  );

  // KRW 포트폴리오에 USD 티커가 있으면 월별 환율 조회
  let fxRates: Record<string, number> = {};
  if (portfolioCurrency === "KRW") {
    const hasUSDTicker = tickers.some((t) => inferTickerCurrency(t) === "USD");
    if (hasUSDTicker) {
      fxRates = await getMonthlyExchangeRates("USD", "KRW", startDate, endDate);
    }
  }

  // 월별 포트폴리오 가치 계산
  const months = generateMonths(startDate, endDate);
  const monthlyValues: MonthlyValue[] = [];

  let cash = 0;
  const holdings: Record<string, number> = {};
  let txIdx = 0;

  for (const monthEnd of months) {
    // 이 월까지의 거래 처리
    while (
      txIdx < sorted.length &&
      new Date(sorted[txIdx].date) <= monthEnd
    ) {
      const tx = sorted[txIdx];
      switch (tx.type) {
        case "CASH_IN":
          cash += tx.totalAmount;
          break;
        case "CASH_OUT":
          cash -= tx.totalAmount;
          break;
        case "BUY":
          cash -= tx.totalAmount;
          if (tx.ticker) {
            holdings[tx.ticker] = (holdings[tx.ticker] || 0) + (tx.quantity || 0);
          }
          break;
        case "SELL":
          cash += tx.totalAmount;
          if (tx.ticker) {
            holdings[tx.ticker] = (holdings[tx.ticker] || 0) - (tx.quantity || 0);
          }
          break;
        case "DIVIDEND":
          cash += tx.totalAmount;
          break;
      }
      txIdx++;
    }

    // 주식 평가액 계산
    let stockValue = 0;
    for (const [ticker, qty] of Object.entries(holdings)) {
      if (qty > 0) {
        const price = getClosestPrice(priceData[ticker] || {}, monthEnd);
        if (price) {
          let convertedPrice = price;
          if (
            portfolioCurrency === "KRW" &&
            inferTickerCurrency(ticker) === "USD" &&
            Object.keys(fxRates).length > 0
          ) {
            const fxRate = getClosestPrice(fxRates, monthEnd);
            if (fxRate) convertedPrice = price * fxRate;
          }
          stockValue += qty * convertedPrice;
        }
      }
    }

    const totalValue = Math.max(0, cash + stockValue);
    if (totalValue > 0 || cash !== 0) {
      const monthStr = formatYYYYMM(monthEnd);
      monthlyValues.push({
        date: monthStr,
        value: totalValue,
        cash: Math.max(0, cash),
        stockValue,
      });
    }
  }

  // 현재 보유 현황 (할당)
  const currentHoldings: AllocationItem[] = [];
  for (const [ticker, qty] of Object.entries(holdings)) {
    if (qty > 0.0001) {
      const price = getClosestPrice(priceData[ticker] || {}, endDate);
      if (price) {
        let convertedPrice = price;
        if (
          portfolioCurrency === "KRW" &&
          inferTickerCurrency(ticker) === "USD" &&
          Object.keys(fxRates).length > 0
        ) {
          const fxRate = getClosestPrice(fxRates, endDate);
          if (fxRate) convertedPrice = price * fxRate;
        }
        const value = qty * convertedPrice;
        const tx = sorted.find((t) => t.ticker === ticker);
        currentHoldings.push({
          ticker,
          name: tx?.tickerName || ticker,
          value,
          quantity: qty,
          percent: 0,
        });
      }
    }
  }

  const currentValue =
    monthlyValues.length > 0
      ? monthlyValues[monthlyValues.length - 1].value
      : 0;
  const lastCash =
    monthlyValues.length > 0
      ? monthlyValues[monthlyValues.length - 1].cash
      : 0;

  // 할당 비중 계산
  const totalWithCash =
    currentHoldings.reduce((s, h) => s + h.value, 0) + lastCash;
  currentHoldings.forEach((h) => {
    h.percent = totalWithCash > 0 ? (h.value / totalWithCash) * 100 : 0;
  });

  const cashPct = totalWithCash > 0 ? (lastCash / totalWithCash) * 100 : 0;

  // 투자금 계산
  const cashInTxs = sorted.filter((t) => t.type === "CASH_IN");
  const cashOutTxs = sorted.filter((t) => t.type === "CASH_OUT");
  const totalInvested = cashInTxs.reduce((s, t) => s + t.totalAmount, 0);
  const totalWithdrawn = cashOutTxs.reduce((s, t) => s + t.totalAmount, 0);
  const netInvested = totalInvested - totalWithdrawn;
  const absoluteGain = currentValue - netInvested;
  const absoluteGainPct = netInvested > 0 ? absoluteGain / netInvested : 0;

  // 연도별 수익률 계산
  const annualReturns = calculateAnnualReturns(monthlyValues);

  // CAGR (TWR 기반)
  const cagr = calculateTWR(sorted, priceData, months, monthlyValues);

  // IRR 계산
  const irr = calculateIRR(sorted, currentValue);

  // Sharpe Ratio
  const sharpeRatio = calculateSharpe(monthlyValues);

  // Max Drawdown
  const maxDrawdown = calculateMaxDrawdown(monthlyValues);

  return {
    currentValue,
    totalInvested,
    totalWithdrawn,
    netInvested,
    absoluteGain,
    absoluteGainPct,
    cagr,
    irr,
    sharpeRatio,
    maxDrawdown,
    monthlyValues,
    annualReturns,
    allocation: currentHoldings,
    cashPct,
  };
}

// ---------- 보조 계산 함수 ----------

function calculateAnnualReturns(monthly: MonthlyValue[]): AnnualReturn[] {
  if (monthly.length < 2) return [];

  const byYear: Record<number, MonthlyValue[]> = {};
  for (const m of monthly) {
    const year = parseInt(m.date.slice(0, 4));
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(m);
  }

  const results: AnnualReturn[] = [];
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => a - b);

  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const yearData = byYear[year];
    const endValue = yearData[yearData.length - 1].value;

    // 연초 기준값: 전년도 마지막 값 or 해당 연도 첫 값
    let startValue: number;
    if (i > 0) {
      const prevYear = years[i - 1];
      const prevData = byYear[prevYear];
      startValue = prevData[prevData.length - 1].value;
    } else {
      startValue = yearData[0].value;
    }

    if (startValue > 0) {
      results.push({
        year,
        return: endValue / startValue - 1,
        startValue,
        endValue,
      });
    }
  }

  return results;
}

function calculateTWR(
  transactions: Transaction[],
  _priceData: Record<string, Record<string, number>>,
  _months: Date[],
  monthlyValues: MonthlyValue[]
): number | null {
  if (monthlyValues.length < 2) return null;

  // 현금흐름 이벤트 날짜 기준으로 구간 수익률 계산 (월별 근사)
  const cashFlowMonths = new Set<string>();
  for (const tx of transactions) {
    if (tx.type === "CASH_IN" || tx.type === "CASH_OUT") {
      cashFlowMonths.add(formatYYYYMM(new Date(tx.date)));
    }
  }

  // 구간 수익률 계산: 현금흐름 직전 구간의 수익률을 연결
  let twr = 1;
  let lastCFIdx = 0;

  for (let i = 1; i < monthlyValues.length; i++) {
    const m = monthlyValues[i];
    if (cashFlowMonths.has(m.date)) {
      // 구간 수익률 적용
      const subReturn =
        monthlyValues[i - 1].value > 0
          ? monthlyValues[i].value / monthlyValues[i - 1].value
          : 1;
      twr *= subReturn;
      lastCFIdx = i;
    }
  }

  // 마지막 구간
  if (lastCFIdx < monthlyValues.length - 1) {
    const subReturn =
      monthlyValues[lastCFIdx].value > 0
        ? monthlyValues[monthlyValues.length - 1].value /
          monthlyValues[lastCFIdx].value
        : 1;
    twr *= subReturn;
  }

  twr -= 1;

  // 연환산
  const firstDate = new Date(monthlyValues[0].date + "-01");
  const lastDate = new Date(
    monthlyValues[monthlyValues.length - 1].date + "-01"
  );
  const years =
    (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 3600 * 1000);

  if (years < 0.1) return twr; // 1년 미만이면 그냥 반환
  return Math.pow(1 + twr, 1 / years) - 1;
}

function calculateIRR(
  transactions: Transaction[],
  currentValue: number
): number | null {
  // 현금흐름: CASH_IN은 투자자 입장에서 지출(-), CASH_OUT은 수입(+)
  const cashflows: Array<{ date: Date; amount: number }> = [];

  for (const tx of transactions) {
    if (tx.type === "CASH_IN") {
      cashflows.push({ date: new Date(tx.date), amount: -tx.totalAmount });
    } else if (tx.type === "CASH_OUT") {
      cashflows.push({ date: new Date(tx.date), amount: tx.totalAmount });
    }
  }

  if (cashflows.length === 0) return null;

  // 현재 포트폴리오 가치를 마지막 현금흐름으로 추가
  cashflows.push({ date: new Date(), amount: currentValue });

  if (cashflows.length < 2) return null;

  // 첫 번째 날짜를 기준 (연 단위)
  const t0 = cashflows[0].date.getTime();
  const datedCFs = cashflows.map((cf) => ({
    t: (cf.date.getTime() - t0) / (365.25 * 24 * 3600 * 1000),
    amount: cf.amount,
  }));

  // Newton's method
  let rate = 0.1;
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0;
    let dnpv = 0;
    for (const { t, amount } of datedCFs) {
      npv += amount / Math.pow(1 + rate, t);
      dnpv += (-t * amount) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(npv) < 0.01) break;
    if (Math.abs(dnpv) < 1e-10) break;
    rate = rate - npv / dnpv;
    if (rate < -0.999) rate = -0.999;
    if (rate > 100) rate = 100;
  }

  if (!isFinite(rate) || isNaN(rate)) return null;
  return rate;
}

function calculateSharpe(monthly: MonthlyValue[]): number | null {
  if (monthly.length < 6) return null;

  const returns: number[] = [];
  for (let i = 1; i < monthly.length; i++) {
    if (monthly[i - 1].value > 0) {
      returns.push(monthly[i].value / monthly[i - 1].value - 1);
    }
  }

  if (returns.length < 3) return null;

  const monthlyRF = 0.04 / 12;
  const excess = returns.map((r) => r - monthlyRF);
  const mean = excess.reduce((a, b) => a + b, 0) / excess.length;
  const variance =
    excess.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / excess.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return null;
  return (mean / stdDev) * Math.sqrt(12);
}

function calculateMaxDrawdown(monthly: MonthlyValue[]): number {
  if (monthly.length === 0) return 0;

  let peak = monthly[0].value;
  let maxDD = 0;

  for (const m of monthly) {
    if (m.value > peak) peak = m.value;
    const dd = peak > 0 ? (m.value - peak) / peak : 0;
    if (dd < maxDD) maxDD = dd;
  }

  return maxDD;
}

function getClosestPrice(
  prices: Record<string, number>,
  targetDate: Date
): number | null {
  const keys = Object.keys(prices).sort();
  if (keys.length === 0) return null;

  const targetStr = formatDateStr(targetDate);

  // 정확히 일치하는 날짜 찾기
  if (prices[targetStr]) return prices[targetStr];

  // 가장 가까운 이전 날짜 찾기
  let closest: string | null = null;
  for (const key of keys) {
    if (key <= targetStr) {
      closest = key;
    }
  }

  return closest ? prices[closest] : null;
}

function generateMonths(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= end) {
    // 월말 날짜 (다음달 1일 - 1일)
    const monthEnd = new Date(
      current.getFullYear(),
      current.getMonth() + 1,
      0
    );
    months.push(new Date(monthEnd));
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatYYYYMM(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function emptyMetrics(): PortfolioMetrics {
  return {
    currentValue: 0,
    totalInvested: 0,
    totalWithdrawn: 0,
    netInvested: 0,
    absoluteGain: 0,
    absoluteGainPct: 0,
    cagr: null,
    irr: null,
    sharpeRatio: null,
    maxDrawdown: 0,
    monthlyValues: [],
    annualReturns: [],
    allocation: [],
    cashPct: 0,
  };
}
