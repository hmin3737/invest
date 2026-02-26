import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const wb = XLSX.utils.book_new();

  // ── 안내 시트 ──────────────────────────────────────────────
  const guide = [
    ["투자 포트폴리오 거래내역 업로드 양식"],
    [""],
    ["【 작성 안내 】"],
    ["1. '거래내역' 탭에 데이터를 입력하세요. 이 안내 탭은 지우지 않아도 됩니다."],
    ["2. 헤더 행(첫 번째 행)은 수정하지 마세요."],
    ["3. 날짜: YYYY-MM-DD 형식  (예: 2024-01-15)"],
    ["4. 유형: 매수 / 매도 / 입금 / 출금 / 배당 / 환전  중 하나 (영문 BUY 등도 가능)"],
    ["5. 총금액: 필수 입력 (양수)"],
    ["6. 티커: 매수·매도·배당은 종목코드, 환전은 수취 통화 코드(예: USD)"],
    ["7. 수량, 단가: 입력하면 검증에 활용됩니다 (선택)."],
    ["8. 환전 행의 통화 열은 KRW(출금 기준통화), 수량=수취외화금액, 단가=환율"],
    [""],
    ["【 유형 코드 】"],
    ["한국어", "영문", "설명"],
    ["매수", "BUY", "주식/ETF 매수"],
    ["매도", "SELL", "주식/ETF 매도"],
    ["입금", "CASH_IN", "포트폴리오에 현금 입금"],
    ["출금", "CASH_OUT", "포트폴리오에서 현금 출금"],
    ["배당", "DIVIDEND", "배당금 수령"],
    ["환전", "FX_CONVERT", "KRW→외화 환전 (티커=수취통화, 수량=외화금액, 단가=환율, 총금액=KRW출금액)"],
    [""],
    ["【 한국 주식 티커 형식 】"],
    ["유가증권시장(KOSPI): 종목코드.KS  예) 005930.KS (삼성전자)"],
    ["코스닥(KOSDAQ):     종목코드.KQ  예) 035720.KQ (카카오)"],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guide);
  wsGuide["!cols"] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, "안내");

  // ── 거래내역 시트 ─────────────────────────────────────────
  const headers = ["날짜", "유형", "티커", "종목명", "수량", "단가", "통화", "총금액", "메모"];
  const examples = [
    ["2024-01-02", "입금",  "",           "",            "",      "",     "KRW", 10000000, "초기 투자금"],
    ["2024-01-03", "환전",  "USD",        "",            1538,    1300,   "KRW", 2000000,  "KRW→USD 환전 (1300원/달러)"],
    ["2024-01-05", "매수",  "AAPL",       "Apple Inc.",  10,      185.5,  "USD", 1855,     "USD→KRW 자동환산 (환전 없이 입력 시)"],
    ["2024-02-01", "매수",  "005930.KS",  "삼성전자",    50,      72000,  "KRW", 3600000,  ""],
    ["2024-06-15", "배당",  "AAPL",       "Apple Inc.",  "",      "",     "KRW", 28000,    "세후 배당금 (이미 KRW)"],
    ["2024-09-01", "매도",  "AAPL",       "Apple Inc.",  5,       225.0,  "USD", 1125,     "USD→KRW 자동환산"],
    ["2024-10-01", "출금",  "",           "",            "",      "",     "KRW", 500000,   "일부 인출"],
  ];

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  wsData["!cols"] = [
    { wch: 13 }, // 날짜
    { wch: 9 },  // 유형
    { wch: 14 }, // 티커
    { wch: 20 }, // 종목명
    { wch: 10 }, // 수량
    { wch: 12 }, // 단가
    { wch: 8 },  // 통화
    { wch: 14 }, // 총금액
    { wch: 30 }, // 메모
  ];
  XLSX.utils.book_append_sheet(wb, wsData, "거래내역");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="portfolio_template.xlsx"',
    },
  });
}
