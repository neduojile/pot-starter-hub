import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const apiBase = process.env.FAUCET_API_URL ?? "http://localhost:4000";
  const requestedLimit = request.nextUrl.searchParams.get("limit") ?? "5";
  const limit = Math.min(Math.max(Number.parseInt(requestedLimit, 10) || 5, 1), 100);

  try {
    const response = await fetch(
      `${apiBase}/faucet/history?limit=${limit}`,
      { cache: "no-store" },
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { message: "Claim history is currently unavailable." },
      { status: 503 },
    );
  }
}
