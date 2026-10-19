import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE =
  process.env.FAUCET_API_URL ?? "http://localhost:4000";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      typeof body.walletAddress !== "string" ||
      !body.walletAddress.trim()
    ) {
      return NextResponse.json(
        { message: "Enter a valid wallet address." },
        { status: 400 },
      );
    }

    const upstream = await fetch(`${API_BASE}/faucet/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: body.walletAddress.trim() }),
      cache: "no-store",
    });

    const payload = await upstream.json().catch(() => ({
      message: "The faucet API returned an unreadable response.",
    }));

    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { message: "Unable to reach the faucet API." },
      { status: 502 },
    );
  }
}
