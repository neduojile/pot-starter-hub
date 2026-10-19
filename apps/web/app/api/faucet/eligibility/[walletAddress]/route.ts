import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ walletAddress: string }> },
) {
  const { walletAddress } = await params;
  const apiBase = process.env.FAUCET_API_URL ?? "http://localhost:4000";

  try {
    const response = await fetch(
      `${apiBase}/faucet/eligibility/${encodeURIComponent(walletAddress)}`,
      { cache: "no-store" },
    );
    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { message: "Could not check claim eligibility." },
      { status: 503 },
    );
  }
}
