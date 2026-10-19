import { NextRequest, NextResponse } from "next/server";
import { checkAddress } from "@polkadot/util-crypto";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim();

  if (!address) {
    return NextResponse.json(
      { valid: false, message: "Enter your native wallet address." },
      { status: 400 },
    );
  }

  try {
    const [valid] = checkAddress(address, 42);

    if (!valid || !address.startsWith("5")) {
      return NextResponse.json(
        {
          valid: false,
          message: "Invalid Portaldot native address. Check the address and try again.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { valid: true, address, message: "Address format verified." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { valid: false, message: "Could not validate this address." },
      { status: 400 },
    );
  }
}
