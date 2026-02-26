import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

async function getPortfolioOrFail(id: string, userId: string) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId },
  });
  return portfolio;
}

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
    include: {
      transactions: { orderBy: { date: "desc" } },
    },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "포트폴리오를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(portfolio);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = params;
  const portfolio = await getPortfolioOrFail(id, session.userId);
  if (!portfolio) {
    return NextResponse.json({ error: "포트폴리오를 찾을 수 없습니다." }, { status: 404 });
  }

  const { name, description, currency, isPublic } = await req.json();

  const updated = await prisma.portfolio.update({
    where: { id },
    data: {
      name: name ?? portfolio.name,
      description: description !== undefined ? description : portfolio.description,
      currency: currency ?? portfolio.currency,
      isPublic: isPublic !== undefined ? isPublic : portfolio.isPublic,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = params;
  const portfolio = await getPortfolioOrFail(id, session.userId);
  if (!portfolio) {
    return NextResponse.json({ error: "포트폴리오를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.portfolio.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
