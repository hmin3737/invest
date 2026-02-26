import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { calculatePortfolioMetrics, Transaction } from "@/lib/calculations";

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  const portfolio = await prisma.portfolio.findFirst({
    where: { shareToken: token, isPublic: true },
    include: { transactions: { orderBy: { date: "asc" } } },
  });

  if (!portfolio) {
    return NextResponse.json(
      { error: "공유 포트폴리오를 찾을 수 없습니다." },
      { status: 404 }
    );
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

  const metrics = await calculatePortfolioMetrics(transactions, portfolio.currency);

  return NextResponse.json({
    portfolio: {
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description,
      currency: portfolio.currency,
    },
    metrics,
  });
}
