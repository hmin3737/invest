import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

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
    const dateStr = formatDateStr(date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 5); // 주말/공휴일 대비 여유

    const results = await yahooFinance.historical(ticker, {
      period1: dateStr,
      period2: formatDateStr(nextDay),
      interval: "1d",
    });

    if (!results || results.length === 0) {
      return null;
    }

    // 요청한 날짜와 가장 가까운 거래일 선택
    const entry = results[0];
    if (priceType === "OPEN") {
      return entry.open ?? entry.close ?? null;
    } else {
      return entry.close ?? entry.adjClose ?? null;
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
    const results = await yahooFinance.historical(ticker, {
      period1: formatDateStr(startDate),
      period2: formatDateStr(endDate),
      interval: "1mo",
    });

    const prices: Record<string, number> = {};
    for (const r of results) {
      const key = formatDateStr(r.date);
      prices[key] = r.adjClose ?? r.close ?? 0;
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
    const results = await yahooFinance.historical(ticker, {
      period1: formatDateStr(startDate),
      period2: formatDateStr(endDate),
      interval: "1d",
    });

    const prices: Record<string, number> = {};
    for (const r of results) {
      const key = formatDateStr(r.date);
      prices[key] = r.adjClose ?? r.close ?? 0;
    }
    return prices;
  } catch (error) {
    console.error(`Daily prices fetch error for ${ticker}:`, error);
    return {};
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

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
