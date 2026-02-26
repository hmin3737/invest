import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; txId: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id: portfolioId, txId } = params;

  // 소유권 확인
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId: session.userId },
  });
  if (!portfolio) {
    return NextResponse.json({ error: "포트폴리오를 찾을 수 없습니다." }, { status: 404 });
  }

  const tx = await prisma.transaction.findFirst({
    where: { id: txId, portfolioId },
  });
  if (!tx) {
    return NextResponse.json({ error: "거래내역을 찾을 수 없습니다." }, { status: 404 });
  }

  const { date, type, ticker, tickerName, quantity, price, totalAmount, priceType, notes } =
    await req.json();

  const updated = await prisma.transaction.update({
    where: { id: txId },
    data: {
      date: date ? new Date(date) : tx.date,
      type: type || tx.type,
      ticker: ticker !== undefined ? ticker || null : tx.ticker,
      tickerName: tickerName !== undefined ? tickerName || null : tx.tickerName,
      quantity: quantity !== undefined ? (quantity ? Number(quantity) : null) : tx.quantity,
      price: price !== undefined ? (price ? Number(price) : null) : tx.price,
      totalAmount: totalAmount !== undefined ? Number(totalAmount) : tx.totalAmount,
      priceType: priceType || tx.priceType,
      notes: notes !== undefined ? notes || null : tx.notes,
    },
  });

  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; txId: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id: portfolioId, txId } = params;

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId: session.userId },
  });
  if (!portfolio) {
    return NextResponse.json({ error: "포트폴리오를 찾을 수 없습니다." }, { status: 404 });
  }

  const tx = await prisma.transaction.findFirst({
    where: { id: txId, portfolioId },
  });
  if (!tx) {
    return NextResponse.json({ error: "거래내역을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id: txId } });
  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
