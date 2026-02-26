import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

const TYPE_MAP: Record<string, string> = {
  매수: "BUY", BUY: "BUY", buy: "BUY",
  매도: "SELL", SELL: "SELL", sell: "SELL",
  입금: "CASH_IN", CASH_IN: "CASH_IN", cash_in: "CASH_IN",
  출금: "CASH_OUT", CASH_OUT: "CASH_OUT", cash_out: "CASH_OUT",
  배당: "DIVIDEND", DIVIDEND: "DIVIDEND", dividend: "DIVIDEND",
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: params.id, userId: session.userId },
  });
  if (!portfolio)
    return NextResponse.json(
      { error: "포트폴리오를 찾을 수 없습니다." },
      { status: 404 }
    );

  // ── 파일 파싱 ──────────────────────────────────────────────
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "파일을 업로드해주세요." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    return NextResponse.json(
      { error: "파일을 읽을 수 없습니다. 올바른 xlsx 파일인지 확인하세요." },
      { status: 400 }
    );
  }

  // '거래내역' 시트 우선, 없으면 첫 번째 시트
  const sheetName = wb.SheetNames.includes("거래내역")
    ? "거래내역"
    : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  // ── 헤더 행 탐색 (최대 5행 이내) ──────────────────────────
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const r = rows[i] as string[];
    if (r.some((c) => String(c).trim() === "날짜" || String(c).trim().toLowerCase() === "date")) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1)
    return NextResponse.json(
      { error: "헤더 행을 찾을 수 없습니다. '날짜' 열이 있는지 확인하세요." },
      { status: 400 }
    );

  const headers = (rows[headerRowIdx] as string[]).map((h) =>
    String(h ?? "").trim()
  );

  const col = (keyword: string) =>
    headers.findIndex((h) => h.includes(keyword));

  const iDate = col("날짜");
  const iType = col("유형");
  const iTicker = col("티커");
  const iTickerName = col("종목명");
  const iQty = col("수량");
  const iPrice = col("단가");
  const iTotal = col("총금액");
  const iNotes = col("메모");

  if (iDate === -1 || iType === -1 || iTotal === -1)
    return NextResponse.json(
      { error: "필수 열(날짜, 유형, 총금액)을 찾을 수 없습니다." },
      { status: 400 }
    );

  // ── 행별 유효성 검사 ──────────────────────────────────────
  const errors: { row: number; message: string }[] = [];
  const valid: {
    portfolioId: string;
    date: Date;
    type: string;
    ticker: string | null;
    tickerName: string | null;
    quantity: number | null;
    price: number | null;
    totalAmount: number;
    priceType: string;
    notes: string | null;
  }[] = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rowNum = i + 1;

    // 빈 행 스킵
    if (row.every((c) => c == null || String(c).trim() === "")) continue;

    const rawDate = row[iDate];
    const rawType = String(row[iType] ?? "").trim();
    const rawTotal = row[iTotal];

    // 날짜
    let date: Date;
    if (rawDate instanceof Date) {
      date = rawDate;
    } else {
      const d = new Date(String(rawDate).trim());
      if (isNaN(d.getTime())) {
        errors.push({
          row: rowNum,
          message: `날짜 형식 오류: "${rawDate}" → YYYY-MM-DD 형식으로 입력하세요.`,
        });
        continue;
      }
      date = d;
    }

    // 유형
    const txType = TYPE_MAP[rawType] ?? TYPE_MAP[rawType.toLowerCase()];
    if (!txType) {
      errors.push({
        row: rowNum,
        message: `유형 오류: "${rawType}" → 매수/매도/입금/출금/배당 중 하나여야 합니다.`,
      });
      continue;
    }

    // 총금액
    const totalAmount = parseFloat(String(rawTotal).replace(/,/g, ""));
    if (isNaN(totalAmount) || totalAmount < 0) {
      errors.push({
        row: rowNum,
        message: `총금액 오류: "${rawTotal}" → 0 이상의 숫자를 입력하세요.`,
      });
      continue;
    }

    // 티커 필수 여부
    const ticker =
      iTicker >= 0 ? String(row[iTicker] ?? "").trim() || null : null;
    if (["BUY", "SELL", "DIVIDEND"].includes(txType) && !ticker) {
      errors.push({
        row: rowNum,
        message: `${rawType} 거래에는 티커 심볼이 필요합니다.`,
      });
      continue;
    }

    const parseNum = (v: unknown) => {
      const n = parseFloat(String(v ?? "").replace(/,/g, ""));
      return isFinite(n) ? n : null;
    };

    const quantity = iQty >= 0 ? parseNum(row[iQty]) : null;
    const price = iPrice >= 0 ? parseNum(row[iPrice]) : null;
    const tickerName =
      iTickerName >= 0 ? String(row[iTickerName] ?? "").trim() || null : null;
    const notes =
      iNotes >= 0 ? String(row[iNotes] ?? "").trim() || null : null;

    // 수량 × 단가 ≈ 총금액 경고 (±10% 이상 차이 나면)
    if (quantity && price) {
      const expected = quantity * price;
      if (expected > 0 && Math.abs(expected - totalAmount) / expected > 0.1) {
        errors.push({
          row: rowNum,
          message: `경고: 수량(${quantity}) × 단가(${price}) = ${expected.toLocaleString()}이지만 총금액은 ${totalAmount.toLocaleString()}입니다. 행을 건너뛰지 않고 그대로 가져옵니다.`,
        });
        // 경고는 에러가 아니므로 valid에 추가
      }
    }

    valid.push({
      portfolioId: portfolio.id,
      date,
      type: txType,
      ticker,
      tickerName,
      quantity,
      price,
      totalAmount,
      priceType: "MANUAL",
      notes,
    });
  }

  if (valid.length === 0 && errors.filter((e) => !e.message.startsWith("경고")).length > 0) {
    return NextResponse.json(
      { imported: 0, errors, total: errors.length },
      { status: 422 }
    );
  }

  if (valid.length === 0)
    return NextResponse.json({ error: "가져올 데이터가 없습니다." }, { status: 400 });

  await prisma.transaction.createMany({ data: valid });

  return NextResponse.json({
    imported: valid.length,
    errors,
    total: valid.length + errors.filter((e) => !e.message.startsWith("경고")).length,
  });
}
