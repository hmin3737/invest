import { getMonthlyPrices, getMonthlyExchangeRates, inferTickerCurrency } from "./yahoo";

export type TransactionType =
  | "BUY"
  | "SELL"
  | "CASH_IN"
  | "CASH_OUT"
  | "DIVIDEND"
  | "FX_CONVERT";

export interface Transaction {
  id: string;
  date: Date;
  type: TransactionType;
  ticker?: string | null;
  tickerName?: string | null;
  quantity?: number | null;
  price?: number | null;
  totalAmount: number;
  txCurrency?: string | null;
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

  // 외화별 월별 환율 맵 (포트폴리오가 KRW인 경우)
  const fxRatesMap: Record<string, Record<string, number>> = {};
  if (portfolioCurrency === "KRW") {
    const foreignCurrencies = new Set<string>();
    // USD 주식 티커
    for (const t of tickers) {
      if (inferTickerCurrency(t) === "USD") foreignCurrencies.add("USD");
    }
    // 명시적 txCurrency 및 FX_CONVERT 대상 통화
    for (const tx of sorted) {
      if (tx.txCurrency && tx.txCurrency !== "KRW") foreignCurrencies.add(tx.txCurrency);
      if (tx.type === "FX_CONVERT" && tx.ticker && tx.ticker !== "KRW") foreignCurrencies.add(tx.ticker);
    }
    await Promise.all(
      Array.from(foreignCurrencies).map(async (curr) => {
        fxRatesMap[curr] = await getMonthlyExchangeRates(curr, "KRW", startDate, endDate);
      })
    );
  }
  // USD 환율 (주식 가격 변환에 사용 — 하위 호환)
  const fxRates = fxRatesMap["USD"] ?? {};

  // 월별 포트폴리오 가치 계산
  const months = generateMonths(startDate, endDate);
  const monthlyValues: MonthlyValue[] = [];

  const cashBalance: Record<string, number> = {};
  const baseCurrency = portfolioCurrency;
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
          cashBalance[baseCurrency] = (cashBalance[baseCurrency] ?? 0) + tx.totalAmount;
          break;
        case "CASH_OUT":
          cashBalance[baseCurrency] = (cashBalance[baseCurrency] ?? 0) - tx.totalAmount;
          break;
        case "FX_CONVERT":
          // 기준통화 출금 → 외화 입금
          cashBalance[baseCurrency] = (cashBalance[baseCurrency] ?? 0) - tx.totalAmount;
          if (tx.ticker) {
            cashBalance[tx.ticker] = (cashBalance[tx.ticker] ?? 0) + (tx.quantity ?? 0);
          }
          break;
        case "BUY": {
          const curr = tx.txCurrency ?? baseCurrency;
          cashBalance[curr] = (cashBalance[curr] ?? 0) - tx.totalAmount;
          if (tx.ticker) {
            holdings[tx.ticker] = (holdings[tx.ticker] || 0) + (tx.quantity || 0);
          }
          break;
        }
        case "SELL": {
          const curr = tx.txCurrency ?? baseCurrency;
          cashBalance[curr] = (cashBalance[curr] ?? 0) + tx.totalAmount;
          if (tx.ticker) {
            holdings[tx.ticker] = (holdings[tx.ticker] || 0) - (tx.quantity || 0);
          }
          break;
        }
        case "DIVIDEND": {
          const curr = tx.txCurrency ?? baseCurrency;
          cashBalance[curr] = (cashBalance[curr] ?? 0) + tx.totalAmount;
          break;
        }
      }
      txIdx++;
    }

    // 현금 가치: 모든 통화를 기준통화로 환산
    let totalCashInBase = 0;
    for (const [curr, amount] of Object.entries(cashBalance)) {
      if (curr === baseCurrency) {
        totalCashInBase += amount;
      } else {
        const currFxRates = fxRatesMap[curr] ?? {};
        const fxRate = getClosestPrice(currFxRates, monthEnd);
        if (fxRate) totalCashInBase += amount * fxRate;
      }
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

    const totalValue = Math.max(0, totalCashInBase + stockValue);
    if (totalValue > 0 || totalCashInBase !== 0) {
      const monthStr = formatYYYYMM(monthEnd);
      monthlyValues.push({
        date: monthStr,
        value: totalValue,
        cash: Math.max(0, totalCashInBase),
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

  // 월별 순 현금흐름 (CASH_IN - CASH_OUT) — TWR/연수익/Sharpe에 공통 사용
  const netCFByMonth: Record<string, number> = {};
  for (const tx of sorted) {
    const m = formatYYYYMM(new Date(tx.date));
    if (tx.type === "CASH_IN")
      netCFByMonth[m] = (netCFByMonth[m] || 0) + tx.totalAmount;
    else if (tx.type === "CASH_OUT")
      netCFByMonth[m] = (netCFByMonth[m] || 0) - tx.totalAmount;
  }

  // 연도별 수익률 계산
  const annualReturns = calculateAnnualReturns(monthlyValues, netCFByMonth);

  // CAGR (TWR 기반, Modified Dietz)
  const cagr = calculateTWR(monthlyValues, netCFByMonth);

  // IRR 계산
  const irr = calculateIRR(sorted, currentValue);

  // Sharpe Ratio
  const sharpeRatio = calculateSharpe(monthlyValues, netCFByMonth);

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

/**
 * 연도별 수익률 — 월별 Modified Dietz 수익률을 연도 내 chain-link
 * (현금흐름 효과를 제거한 순수 투자 수익률)
 */
function calculateAnnualReturns(
  monthly: MonthlyValue[],
  netCFByMonth: Record<string, number>
): AnnualReturn[] {
  if (monthly.length < 2) return [];

  // 월별 CF-adjusted 수익률 계산
  const monthlyReturns: Array<{ date: string; r: number }> = [];
  for (let i = 1; i < monthly.length; i++) {
    const prev = monthly[i - 1];
    const curr = monthly[i];
    if (prev.value <= 0) continue;
    const cf = netCFByMonth[curr.date] || 0;
    // Modified Dietz (CF at month-end): (V_end - CF) / V_start
    const r = (curr.value - cf) / prev.value;
    if (r > 0) monthlyReturns.push({ date: curr.date, r });
  }

  // 연도별 수익률 chain-link
  const byYear: Record<number, number[]> = {};
  for (const { date, r } of monthlyReturns) {
    const year = parseInt(date.slice(0, 4));
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(r);
  }

  // 연도별 startValue/endValue는 실제 monthly 값에서 가져옴
  const byYearMonthly: Record<number, MonthlyValue[]> = {};
  for (const m of monthly) {
    const year = parseInt(m.date.slice(0, 4));
    if (!byYearMonthly[year]) byYearMonthly[year] = [];
    byYearMonthly[year].push(m);
  }

  const results: AnnualReturn[] = [];
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);

  for (const year of years) {
    const yearReturns = byYear[year];
    const yearReturn = yearReturns.reduce((acc, r) => acc * r, 1) - 1;

    const prevYearMonthly = byYearMonthly[year - 1];
    const thisYearMonthly = byYearMonthly[year];
    const startValue = prevYearMonthly
      ? prevYearMonthly[prevYearMonthly.length - 1].value
      : thisYearMonthly[0].value;
    const endValue = thisYearMonthly[thisYearMonthly.length - 1].value;

    if (startValue > 0) {
      results.push({ year, return: yearReturn, startValue, endValue });
    }
  }

  return results;
}

/**
 * CAGR (TWR 기반, Modified Dietz 월별 근사)
 *
 * 핵심 아이디어:
 *   월 수익률 = (V_월말 - 해당월 순CF) / V_전월말
 * → 현금 입출금 효과를 제거한 순수 투자 수익률만 곱함
 */
function calculateTWR(
  monthlyValues: MonthlyValue[],
  netCFByMonth: Record<string, number>
): number | null {
  if (monthlyValues.length < 2) return null;

  let twr = 1;
  for (let i = 1; i < monthlyValues.length; i++) {
    const prev = monthlyValues[i - 1];
    const curr = monthlyValues[i];
    if (prev.value <= 0) continue;
    const cf = netCFByMonth[curr.date] || 0;
    const subReturn = (curr.value - cf) / prev.value;
    if (subReturn > 0) twr *= subReturn;
  }
  twr -= 1;

  // 연환산 CAGR
  const firstDate = new Date(monthlyValues[0].date + "-01");
  const lastDate = new Date(monthlyValues[monthlyValues.length - 1].date + "-01");
  const years = (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 3600 * 1000);

  if (years < 0.1) return twr;
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

function calculateSharpe(
  monthly: MonthlyValue[],
  netCFByMonth: Record<string, number>
): number | null {
  if (monthly.length < 6) return null;

  const returns: number[] = [];
  for (let i = 1; i < monthly.length; i++) {
    if (monthly[i - 1].value <= 0) continue;
    const cf = netCFByMonth[monthly[i].date] || 0;
    const r = (monthly[i].value - cf) / monthly[i - 1].value - 1;
    returns.push(r);
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
