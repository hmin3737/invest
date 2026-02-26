import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id: portfolioId } = params;

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId: session.userId },
  });
  if (!portfolio) {
    return NextResponse.json({ error: "포트폴리오를 찾을 수 없습니다." }, { status: 404 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { portfolioId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id: portfolioId } = params;

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId: session.userId },
  });
  if (!portfolio) {
    return NextResponse.json({ error: "포트폴리오를 찾을 수 없습니다." }, { status: 404 });
  }

  const { date, type, ticker, tickerName, quantity, price, totalAmount, priceType, notes, txCurrency } =
    await req.json();

  if (!date || !type || totalAmount === undefined) {
    return NextResponse.json(
      { error: "필수 항목(날짜, 유형, 금액)을 입력해주세요." },
      { status: 400 }
    );
  }

  const validTypes = ["BUY", "SELL", "CASH_IN", "CASH_OUT", "DIVIDEND", "FX_CONVERT"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "유효하지 않은 거래 유형입니다." }, { status: 400 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      portfolioId,
      date: new Date(date),
      type,
      ticker: ticker || null,
      tickerName: tickerName || null,
      quantity: quantity ? Number(quantity) : null,
      price: price ? Number(price) : null,
      totalAmount: Number(totalAmount),
      priceType: priceType || "MANUAL",
      notes: notes || null,
      txCurrency: txCurrency || null,
    },
  });

  // 포트폴리오 updatedAt 업데이트
  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(transaction, { status: 201 });
}
