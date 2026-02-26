import YahooFinance from "yahoo-finance2";
import { inferTickerCurrency as _inferTickerCurrency } from "./utils";
const yahooFinance = new YahooFinance({ suppressNotices: ["ripHistorical"] });

export interface PriceResult {
  ticker: string;
  date: string;
  open: number | null;
  close: number | null;
  currency: string;
}

export interface HistoricalPrice {
  date: string; // YYYY-MM-DD
  open: number;
  close: number;
}

/**
 * 특정 날짜의 시가/종가를 조회합니다.
 */
export async function getPriceOnDate(
  ticker: string,
  date: Date,
  priceType: "OPEN" | "CLOSE"
): Promise<number | null> {
  try {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 5); // 주말/공휴일 대비 여유

    const result = await yahooFinance.chart(ticker, {
      period1: formatDateStr(date),
      period2: formatDateStr(nextDay),
      interval: "1d",
    });

    const quotes = result?.quotes;
    if (!quotes || quotes.length === 0) return null;

    const entry = quotes[0];
    if (priceType === "OPEN") {
      return entry.open ?? entry.close ?? null;
    } else {
      return entry.adjclose ?? entry.close ?? null;
    }
  } catch (error) {
    console.error(`Price fetch error for ${ticker} on ${date}:`, error);
    return null;
  }
}

/**
 * 기간 내 월별 종가 데이터를 조회합니다.
 */
export async function getMonthlyPrices(
  ticker: string,
  startDate: Date,
  endDate: Date
): Promise<Record<string, number>> {
  try {
    const result = await yahooFinance.chart(ticker, {
      period1: formatDateStr(startDate),
      period2: formatDateStr(endDate),
      interval: "1mo",
    });

    const prices: Record<string, number> = {};
    for (const r of result?.quotes ?? []) {
      if (r.date && (r.adjclose ?? r.close) != null) {
        const key = formatDateStr(r.date);
        prices[key] = (r.adjclose ?? r.close)!;
      }
    }
    return prices;
  } catch (error) {
    console.error(`Monthly prices fetch error for ${ticker}:`, error);
    return {};
  }
}

/**
 * 기간 내 일별 종가 데이터를 조회합니다.
 */
export async function getDailyPrices(
  ticker: string,
  startDate: Date,
  endDate: Date
): Promise<Record<string, number>> {
  try {
    const result = await yahooFinance.chart(ticker, {
      period1: formatDateStr(startDate),
      period2: formatDateStr(endDate),
      interval: "1d",
    });

    const prices: Record<string, number> = {};
    for (const r of result?.quotes ?? []) {
      if (r.date && (r.adjclose ?? r.close) != null) {
        const key = formatDateStr(r.date);
        prices[key] = (r.adjclose ?? r.close)!;
      }
    }
    return prices;
  } catch (error) {
    console.error(`Daily prices fetch error for ${ticker}:`, error);
    return {};
  }
}

/**
 * USD/KRW 등 월별 환율 데이터를 조회합니다.
 * e.g. getMonthlyExchangeRates("USD", "KRW", ...) → USDKRW=X 조회
 */
export async function getMonthlyExchangeRates(
  from: string,
  to: string,
  startDate: Date,
  endDate: Date
): Promise<Record<string, number>> {
  if (from === to) return {};
  return getMonthlyPrices(`${from}${to}=X`, startDate, endDate);
}

/**
 * 현재 환율을 조회합니다. e.g. getCurrentExchangeRate("USD", "KRW") → ~1380
 */
export async function getCurrentExchangeRate(
  from: string,
  to: string
): Promise<number> {
  if (from === to) return 1;
  try {
    const ticker = `${from}${to}=X`;
    const quote = await yahooFinance.quote(ticker);
    return (quote as { regularMarketPrice?: number }).regularMarketPrice ?? 1;
  } catch {
    return 1;
  }
}

/**
 * 티커 검색 (자동완성용)
 */
export async function searchTicker(
  query: string
): Promise<Array<{ symbol: string; name: string; exchange: string }>> {
  try {
    const results = await yahooFinance.search(query);
    return (results.quotes || [])
      .filter((q) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
      .slice(0, 8)
      .map((q) => ({
        symbol: (q as { symbol?: string }).symbol ?? "",
        name: (q as { longname?: string; shortname?: string }).longname ?? (q as { shortname?: string }).shortname ?? "",
        exchange: (q as { exchange?: string }).exchange ?? "",
      }));
  } catch (error) {
    console.error("Ticker search error:", error);
    return [];
  }
}

// re-export for callers that still import from yahoo
export { _inferTickerCurrency as inferTickerCurrency };

export function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
