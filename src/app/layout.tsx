import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invest — 투자 포트폴리오 분석기",
  description:
    "현금흐름을 반영한 정밀한 투자 포트폴리오 분석. CAGR, Sharpe Ratio, IRR 등 전문 지표를 한눈에.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Invest — 투자 포트폴리오 분석기",
    description: "현금흐름을 반영한 정밀한 투자 포트폴리오 분석",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
