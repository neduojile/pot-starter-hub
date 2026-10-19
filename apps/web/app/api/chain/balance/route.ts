import { NextRequest, NextResponse } from "next/server";
import { checkAddress } from "@polkadot/util-crypto";
import { getPortaldotAccountBalance } from "@pot-starter-hub/blockchain";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim();

  if (!address) {
    return NextResponse.json(
      { message: "Enter your native wallet address." },
      { status: 400 },
    );
  }

  try {
    const [valid] = checkAddress(address, 42);

    if (!valid || !address.startsWith("5")) {
      return NextResponse.json(
        { message: "Enter a valid Portaldot native address." },
        { status: 400 },
      );
    }

    const account = await getPortaldotAccountBalance(address);
    const decimals = 100_000_000_000_000n;

    const whole = account.free / decimals;
    const fraction = (account.free % decimals)
      .toString()
      .padStart(14, "0")
      .replace(/0+$/, "");

    return NextResponse.json(
      {
        address,
        free: fraction ? `${whole}.${fraction}` : whole.toString(),
        symbol: "tPOT",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { message: "Could not read the live balance. Please try again later." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

