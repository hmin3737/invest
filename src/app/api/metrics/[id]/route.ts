import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calculatePortfolioMetrics, Transaction } from "@/lib/calculations";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = params;

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId: session.userId },
    include: { transactions: { orderBy: { date: "asc" } } },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "포트폴리오를 찾을 수 없습니다." }, { status: 404 });
  }

  const transactions: Transaction[] = portfolio.transactions.map((t) => ({
    id: t.id,
    date: t.date,
    type: t.type as Transaction["type"],
    ticker: t.ticker,
    tickerName: t.tickerName,
    quantity: t.quantity,
    price: t.price,
    totalAmount: t.totalAmount,
  }));

  const metrics = await calculatePortfolioMetrics(transactions);

  return NextResponse.json({
    portfolio: {
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description,
      currency: portfolio.currency,
      shareToken: portfolio.shareToken,
      isPublic: portfolio.isPublic,
    },
    metrics,
  });
}
