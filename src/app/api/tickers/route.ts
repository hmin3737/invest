import { NextRequest, NextResponse } from "next/server";
import { searchTicker } from "@/lib/yahoo";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.length < 1) {
    return NextResponse.json([]);
  }

  const results = await searchTicker(query);
  return NextResponse.json(results);
}
