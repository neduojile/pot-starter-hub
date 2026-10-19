import { NextResponse } from "next/server";

export async function GET() {
  const apiBase = process.env.FAUCET_API_URL ?? "http://localhost:4000";

  try {
    const response = await fetch(`${apiBase}/faucet/config`, {
      cache: "no-store",
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { message: "The faucet API is currently unavailable." },
      { status: 503 },
    );
  }
}
