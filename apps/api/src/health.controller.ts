import {
  Controller,
  Get,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  getPortaldotAccountBalance,
  getPortaldotChainInfo,
} from "@pot-starter-hub/blockchain";
import { PrismaService } from "./prisma.service";
import { FaucetSignerService } from "./faucet-signer.service";

const EXPECTED_GENESIS =
  "0xd4f9acbcf7f52388d8b095abe3c198d19fc510e0343e643e87cfbccb155283bd";

const TOKEN_DECIMALS = 14n;
const STALE_PENDING_MINUTES = 5;

function formatToken(value: bigint): string {
  const whole = value / 10n ** TOKEN_DECIMALS;
  const fraction = (value % 10n ** TOKEN_DECIMALS)
    .toString()
    .padStart(Number(TOKEN_DECIMALS), "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole.toString();
}

@Controller("health")
export class HealthController {
  constructor(
    private readonly database: PrismaService,
    private readonly signer: FaucetSignerService,
  ) {}

  @Get()
  check() {
    return {
      status: "ok",
      service: "pot-starter-hub-api",
    };
  }

  @Get("operations")
  async operations() {
    const checkedAt = new Date();
    const dayStart = new Date(checkedAt);
    dayStart.setUTCHours(0, 0, 0, 0);

    const result: Record<string, unknown> = {
      checkedAt: checkedAt.toISOString(),
      status: "degraded",
    };

    const checks = await Promise.allSettled([
      this.database.client.$queryRaw`SELECT 1`,
      getPortaldotChainInfo(),
      this.signer.getAddress(),
      this.database.client.faucetConfig.findUnique({
        where: { id: "default" },
      }),
      this.database.client.faucetClaim.count({
        where: { status: "PENDING" },
      }),
      this.database.client.faucetClaim.count({
        where: {
          status: "PENDING",
          createdAt: {
            lt: new Date(
              checkedAt.getTime() - STALE_PENDING_MINUTES * 60 * 1000,
            ),
          },
        },
      }),
      this.database.client.faucetClaim.groupBy({
        by: ["status"],
        where: { createdAt: { gte: dayStart } },
        _count: { _all: true },
      }),
    ]);

    const [db, chain, address, config, pending, stale, daily] = checks;

    result.database = {
      status: db.status === "fulfilled" ? "connected" : "unavailable",
    };

    if (chain.status === "fulfilled") {
      const matchesExpected =
        chain.value.genesisHash.toLowerCase() === EXPECTED_GENESIS.toLowerCase();

      result.blockchain = {
        status: matchesExpected ? "connected" : "unexpected_network",
        name: chain.value.name,
        genesisHash: chain.value.genesisHash,
        expectedNetwork: matchesExpected,
      };
    } else {
      result.blockchain = { status: "unavailable" };
    }

    if (address.status === "fulfilled") {
      try {
        const balance = await getPortaldotAccountBalance(address.value);

        result.reserve = {
          status: "readable",
          address: balance.address,
          free: formatToken(balance.free),
          reserved: formatToken(balance.reserved),
          frozen: formatToken(balance.frozen),
          nonce: balance.nonce,
        };
      } catch {
        result.reserve = { status: "unavailable" };
      }
    } else {
      result.reserve = { status: "signer_unavailable" };
    }

    result.claims = {
      pending: pending.status === "fulfilled" ? pending.value : null,
      stalePending:
        stale.status === "fulfilled" ? stale.value : null,
      staleThresholdMinutes: STALE_PENDING_MINUTES,
      daily:
        daily.status === "fulfilled"
          ? Object.fromEntries(
              daily.value.map((entry) => [
                entry.status.toLowerCase(),
                entry._count._all,
              ]),
            )
          : null,
    };

    if (config.status === "fulfilled" && config.value) {
      result.configuration = {
        status: "available",
        paused: config.value.paused,
        claimAmount: config.value.claimAmount.toString(),
        cooldownSeconds: config.value.cooldownSeconds,
        dailyLimit: config.value.dailyLimit,
      };
    } else {
      result.configuration = { status: "unavailable" };
    }

    const healthy =
      db.status === "fulfilled" &&
      chain.status === "fulfilled" &&
      chain.value.genesisHash.toLowerCase() === EXPECTED_GENESIS.toLowerCase() &&
      address.status === "fulfilled" &&
      config.status === "fulfilled" &&
      config.value !== null &&
      pending.status === "fulfilled" &&
      stale.status === "fulfilled" &&
      stale.value === 0 &&
      daily.status === "fulfilled" &&
      "reserve" in result &&
      (result.reserve as { status?: string }).status === "readable";

    result.status = healthy ? "healthy" : "degraded";

    if (!healthy) {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
