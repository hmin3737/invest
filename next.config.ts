import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Prisma는 서버 컴포넌트 번들에서 제외 (Node.js 네이티브 모듈 포함)
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma", "bcryptjs"],
  },
  // yahoo-finance2 요청 시 CORS 우회용 헤더 설정
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_BASE_URL || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
