import { NextRequest, NextResponse } from "next/server";
import { getPriceOnDate, getCurrentExchangeRate, inferTickerCurrency } from "@/lib/yahoo";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get("ticker");
  const dateStr = searchParams.get("date");
  const priceType = searchParams.get("priceType") as "OPEN" | "CLOSE" | null;
  const currency = searchParams.get("currency") || "USD";

  if (!ticker || !dateStr || !priceType) {
    return NextResponse.json(
      { error: "ticker, date, priceType 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  if (priceType !== "OPEN" && priceType !== "CLOSE") {
    return NextResponse.json(
      { error: "priceType은 OPEN 또는 CLOSE 이어야 합니다." },
      { status: 400 }
    );
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "유효하지 않은 날짜입니다." }, { status: 400 });
  }

  // 미래 날짜 체크
  if (date > new Date()) {
    return NextResponse.json({ error: "미래 날짜는 조회할 수 없습니다." }, { status: 400 });
  }

  const applyFx = async (rawPrice: number, finalTicker: string) => {
    if (currency === "KRW" && inferTickerCurrency(finalTicker) === "USD") {
      const rate = await getCurrentExchangeRate("USD", "KRW");
      return Math.round(rawPrice * rate);
    }
    return rawPrice;
  };

  let price = await getPriceOnDate(ticker.toUpperCase(), date, priceType);
  let finalTicker = ticker.toUpperCase();

  if (price === null) {
    // 한국 주식이면 .KS 접미사 시도
    if (!ticker.includes(".") && /^\d{6}$/.test(ticker)) {
      const priceKS = await getPriceOnDate(`${ticker}.KS`, date, priceType);
      if (priceKS !== null) {
        return NextResponse.json({
          ticker: `${ticker}.KS`,
          price: await applyFx(priceKS, `${ticker}.KS`),
          priceType,
          date: dateStr,
        });
      }
      const priceKQ = await getPriceOnDate(`${ticker}.KQ`, date, priceType);
      if (priceKQ !== null) {
        return NextResponse.json({
          ticker: `${ticker}.KQ`,
          price: await applyFx(priceKQ, `${ticker}.KQ`),
          priceType,
          date: dateStr,
        });
      }
    }
    return NextResponse.json(
      { error: `${ticker}의 ${dateStr} 가격 정보를 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ticker: finalTicker,
    price: await applyFx(price, finalTicker),
    priceType,
    date: dateStr,
  });
}
