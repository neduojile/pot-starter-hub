import { resolve } from "node:path";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { checkAddress } from "@polkadot/util-crypto";
import { spawn } from "node:child_process";
import { getTxCreator } from "@polkadot-api/raw-tx-creator";
import {
  getPortaldotAccountBalance,
  getPortaldotChainInfo,
  portaldotApi,
} from "@pot-starter-hub/blockchain";
import { PrismaService } from "./prisma.service";
import { FaucetSignerService } from "./faucet-signer.service";

const EXPECTED_GENESIS =
  "0xd4f9acbcf7f52388d8b095abe3c198d19fc510e0343e643e87cfbccb155283bd";

@Injectable()
export class FaucetService {
  constructor(
    private readonly database: PrismaService,
    private readonly signer: FaucetSignerService,
  ) {}

  async getConfig() {
    try {
      const config = await this.database.client.faucetConfig.findUnique({
        where: { id: "default" },
      });

      if (!config) {
        throw new ServiceUnavailableException(
          "Faucet configuration has not been initialized.",
        );
      }

      return {
        claimAmount: config.claimAmount.toString(),
        cooldownSeconds: config.cooldownSeconds,
        dailyLimit: config.dailyLimit,
        paused: config.paused,
        updatedAt: config.updatedAt,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        "Unable to retrieve faucet configuration.",
      );
    }
  }

  async getHistory(limit = 20) {
    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 20, 1), 100);
    const claims = await this.database.client.faucetClaim.findMany({
      where: { status: "CONFIRMED", confirmedAt: { not: null } },
      orderBy: { confirmedAt: "desc" },
      take: safeLimit,
      select: {
        id: true,
        walletAddress: true,
        amount: true,
        status: true,
        txHash: true,
        createdAt: true,
        confirmedAt: true,
      },
    });

    return claims.map((claim) => ({
      ...claim,
      amount: claim.amount.toString(),
    }));
  }

  async getEligibility(walletAddress: string) {
    const address = walletAddress.trim();
    if (!address || address.length > 128 || !checkAddress(address, 42)[0]) {
      return { eligible: false, reason: "Invalid wallet address." };
    }

    const config = await this.database.client.faucetConfig.findUnique({
      where: { id: "default" },
    });
    if (!config) {
      throw new ServiceUnavailableException(
        "Faucet configuration has not been initialized.",
      );
    }
    if (process.env.FAUCET_CLAIMS_ENABLED !== "true") {
      return {
        eligible: false,
        reason: "Faucet claims are temporarily disabled.",
      };
    }

    if (config.paused) {
      return {
        eligible: false,
        reason: "The faucet is paused.",
      };
    }

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);

    const [latestClaim, dailyCount] = await Promise.all([
      this.database.client.faucetClaim.findFirst({
        where: {
          walletAddress: address,
          status: "CONFIRMED",
          confirmedAt: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, confirmedAt: true, status: true },
      }),
      this.database.client.faucetClaim.count({
        where: {
          createdAt: { gte: dayStart },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      }),
    ]);

    if (dailyCount >= config.dailyLimit) {
      return {
        eligible: false,
        reason: "The faucet daily limit has been reached.",
      };
    }

    if (latestClaim?.status === "CONFIRMED" && latestClaim.confirmedAt) {
      const nextClaimAt = new Date(
        latestClaim.confirmedAt.getTime() + config.cooldownSeconds * 1000,
      );
      if (nextClaimAt > now) {
        return {
          eligible: false,
          reason: "The wallet is still on cooldown.",
          nextClaimAt,
        };
      }
    }

    return { eligible: true, claimAmount: config.claimAmount.toString() };
  }

  async claim(walletAddress: string) {
    if (process.env.FAUCET_CLAIMS_ENABLED !== "true") {
      throw new ServiceUnavailableException(
        "Faucet claims are not enabled yet.",
      );
    }

    const address = walletAddress?.trim();
    if (!address || address.length > 128 || !checkAddress(address, 42)[0]) {
      throw new BadRequestException("Enter a valid Portaldot wallet address.");
    }

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);

    const reservation = await this.database.client.$transaction(async (db) => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(20261017, hashtext(${address}))`;
      await db.$executeRaw`SELECT pg_advisory_xact_lock(20261017, 0)`;

      const config = await db.faucetConfig.findUnique({
        where: { id: "default" },
      });
      if (!config) {
        throw new ServiceUnavailableException(
          "Faucet configuration has not been initialized.",
        );
      }
      if (config.paused) {
        throw new ServiceUnavailableException("The faucet is paused.");
      }

      const [latest, dailyCount] = await Promise.all([
        db.faucetClaim.findFirst({
          where: {
            walletAddress: address,
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          orderBy: { createdAt: "desc" },
        }),
        db.faucetClaim.count({
          where: {
            createdAt: { gte: dayStart },
            status: { in: ["PENDING", "CONFIRMED"] },
          },
        }),
      ]);

      if (latest?.status === "PENDING") {
        throw new ConflictException(
          "This wallet already has a claim awaiting confirmation.",
        );
      }
      if (
        latest &&
        latest.createdAt.getTime() + config.cooldownSeconds * 1000 > Date.now()
      ) {
        throw new ConflictException("This wallet is still on cooldown.");
      }
      if (dailyCount >= config.dailyLimit) {
        throw new ConflictException(
          "The faucet daily limit has been reached.",
        );
      }

      const claim = await db.faucetClaim.create({
        data: {
          walletAddress: address,
          amount: config.claimAmount,
          status: "PENDING",
        },
      });

      return { claim, amount: config.claimAmount };
    }, { maxWait: 15000, timeout: 30000 });


    let result: any;

    try {
      const adapterPath =
        process.env.POT_TRANSFER_ADAPTER_PATH ??
        resolve(process.cwd(), "adapter/transfer.cjs");

      const raw = await new Promise<string>((resolve, reject) => {
        const child = spawn(process.execPath, [adapterPath], {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });

        let stdout = "";
        let stdoutBuffer = "";
        let stderr = "";
        let settled = false;
        let txHashPersist = Promise.resolve();

        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          child.kill();
          reject(new Error("Adapter timed out; claim remains pending for reconciliation."));
        }, 150000);

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk) => {
          stdout += chunk;
          stdoutBuffer += chunk;
          const lines = stdoutBuffer.split(/\r?\n/);
          stdoutBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const message = JSON.parse(line);
              if (message.event === "included" && message.txHash) {
                txHashPersist = txHashPersist.then(async () => {
                  await this.database.client.faucetClaim.update({
                    where: { id: reservation.claim.id },
                    data: {
                      txHash: message.txHash,
                      ...(message.blockHash
                        ? { blockHash: message.blockHash }
                        : {}),
                    },
                  });
                }).catch((error) => {
                  console.error("[FAUCET TRANSACTION LOCATION SAVE ERROR]", error);
                });
              }
            } catch {
              // Ignore non-JSON adapter output; final result is parsed on close.
            }
          }
        });
        child.stderr.on("data", (chunk) => { stderr += chunk; });

        child.on("error", (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(error);
        });

        child.on("close", async () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          await txHashPersist;

          const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
          const jsonLine = [...lines].reverse().find((line) => {
            try {
              const value = JSON.parse(line);
              return value && typeof value === "object";
            } catch {
              return false;
            }
          });

          if (!jsonLine) {
            console.error("[FAUCET ADAPTER ERROR]", stderr.slice(-2000));
            reject(new Error("Adapter returned no JSON result; claim remains pending for reconciliation."));
            return;
          }

          resolve(jsonLine);
        });

        child.stdin.end(JSON.stringify({
          action: "submit",
          recipient: address,
          amount: reservation.amount.toString(),
        }));
      });

      result = JSON.parse(raw);
    } catch (error) {
      console.error("[FAUCET ADAPTER ERROR]", error);
      throw new ServiceUnavailableException(
        `Claim ${reservation.claim.id} is awaiting transaction reconciliation. Do not retry it until its on-chain outcome is checked.`,
      );
    }

    if (result.ok === false && result.finalized === true && result.txHash) {
      await this.database.client.faucetClaim.update({
        where: { id: reservation.claim.id },
        data: {
          status: "FAILED",
          txHash: result.txHash,
          failureReason: String(result.failureReason ?? "Finalized on-chain dispatch failure.").slice(0, 500),
        },
      });
      throw new ServiceUnavailableException(
        "The network finalized the transaction with a dispatch failure.",
      );
    }

    if (result.ok !== true || result.finalized !== true || !result.txHash) {
      console.error("[FAUCET ADAPTER UNCONFIRMED]", result);
      throw new ServiceUnavailableException(
        `Claim ${reservation.claim.id} is awaiting transaction reconciliation. Do not retry it until its on-chain outcome is checked.`,
      );
    }

    const confirmed = await this.database.client.faucetClaim.update({
      where: { id: reservation.claim.id },
      data: {
        status: "CONFIRMED",
        txHash: result.txHash,
        confirmedAt: new Date(),
      },
    });

    return {
      id: confirmed.id,
      walletAddress: confirmed.walletAddress,
      amount: confirmed.amount.toString(),
      status: confirmed.status,
      txHash: confirmed.txHash,
      confirmedAt: confirmed.confirmedAt,
    };
  }
}




