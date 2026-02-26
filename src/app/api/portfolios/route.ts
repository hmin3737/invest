import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const portfolios = await prisma.portfolio.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    include: {
      transactions: {
        orderBy: { date: "desc" },
        take: 1,
      },
      _count: { select: { transactions: true } },
    },
  });

  return NextResponse.json(portfolios);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { name, description, currency } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "포트폴리오 이름을 입력해주세요." }, { status: 400 });
  }

  const portfolio = await prisma.portfolio.create({
    data: {
      userId: session.userId,
      name,
      description: description || null,
      currency: currency || "KRW",
    },
  });

  return NextResponse.json(portfolio, { status: 201 });
}
