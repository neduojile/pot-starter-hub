import { NextResponse } from "next/server";
import { getPortaldotChainInfo } from "@pot-starter-hub/blockchain";

export const dynamic = "force-dynamic";

const EXPECTED_CHAIN = "PortaldotV3 Test";
const EXPECTED_GENESIS =
  "0xd4f9acbcf7f52388d8b095abe3c198d19fc510e0343e643e87cfbccb155283bd";

export async function GET() {
  try {
    const info = await Promise.race([
      getPortaldotChainInfo(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("RPC timeout")), 5000)
      ),
    ]);

    const online =
      info.name === EXPECTED_CHAIN &&
      info.genesisHash.toLowerCase() === EXPECTED_GENESIS.toLowerCase();

    return NextResponse.json(
      {
        online,
        chain: info.name,
        message: online
          ? "Portaldot V3 RPC is responding."
          : "The RPC responded, but the chain identity did not match.",
      },
      {
        status: online ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch {
    return NextResponse.json(
      {
        online: false,
        message: "Portaldot V3 RPC did not respond in time.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
