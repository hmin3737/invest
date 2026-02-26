import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number,
  currency: string = "KRW"
): string {
  const locale = currency === "KRW" ? "ko-KR" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateInput(date: Date | string): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const TRANSACTION_TYPES = {
  BUY: "매수",
  SELL: "매도",
  CASH_IN: "입금",
  CASH_OUT: "출금",
  DIVIDEND: "배당",
  FX_CONVERT: "환전",
} as const;

export const TRANSACTION_COLORS = {
  BUY: "text-blue-400",
  SELL: "text-purple-400",
  CASH_IN: "text-emerald-400",
  CASH_OUT: "text-red-400",
  DIVIDEND: "text-yellow-400",
  FX_CONVERT: "text-orange-400",
} as const;

export type TxType = keyof typeof TRANSACTION_TYPES;

/**
 * 티커의 거래 통화를 추론합니다.
 * 한국 주식: 6자리 숫자, .KS, .KQ → KRW; 그 외 → USD
 */
export function inferTickerCurrency(ticker: string): string {
  if (
    ticker.endsWith(".KS") ||
    ticker.endsWith(".KQ") ||
    /^\d{6}$/.test(ticker)
  ) {
    return "KRW";
  }
  return "USD";
}
