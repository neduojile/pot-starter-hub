import test from "node:test";
import assert from "node:assert/strict";
import { ServiceUnavailableException } from "@nestjs/common";
import { encodeAddress } from "@polkadot/util-crypto";
import { FaucetService } from "../src/faucet.service.js";

const publicKey = Uint8Array.from(
  Buffer.from(
    "d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d",
    "hex",
  ),
);

const wallet = encodeAddress(publicKey, 42);

const config = {
  claimAmount: 1000000000000000n,
  cooldownSeconds: 86400,
  dailyLimit: 100,
  paused: false,
};

function createService(options: {
  faucetConfig?: typeof config | null;
  latestClaim?: any;
  dailyCount?: number;
} = {}) {
  const findUnique = async () => options.faucetConfig === undefined
    ? config
    : options.faucetConfig;

  const findFirst = async () => options.latestClaim ?? null;
  const count = async () => options.dailyCount ?? 0;

  const database = {
    client: {
      faucetConfig: { findUnique },
      faucetClaim: { findFirst, count },
    },
  };

  return new FaucetService(database as any, {} as any);
}

async function withClaimsEnabled<T>(callback: () => Promise<T>): Promise<T> {
  const previous = process.env.FAUCET_CLAIMS_ENABLED;
  process.env.FAUCET_CLAIMS_ENABLED = "true";

  try {
    return await callback();
  } finally {
    if (previous === undefined) {
      delete process.env.FAUCET_CLAIMS_ENABLED;
    } else {
      process.env.FAUCET_CLAIMS_ENABLED = previous;
    }
  }
}

test("rejects claims when the feature flag is disabled", async () => {
  const previous = process.env.FAUCET_CLAIMS_ENABLED;
  delete process.env.FAUCET_CLAIMS_ENABLED;

  try {
    const service = createService();
    const result = await service.getEligibility(wallet);

    assert.equal(result.eligible, false);
    assert.equal(result.reason, "Faucet claims are temporarily disabled.");
  } finally {
    if (previous !== undefined) {
      process.env.FAUCET_CLAIMS_ENABLED = previous;
    }
  }
});

test("rejects claims when the faucet is paused", async () => {
  await withClaimsEnabled(async () => {
    const service = createService({
      faucetConfig: { ...config, paused: true },
    });

    const result = await service.getEligibility(wallet);

    assert.equal(result.eligible, false);
    assert.equal(result.reason, "The faucet is paused.");
  });
});

test("rejects claims when the daily limit is reached", async () => {
  await withClaimsEnabled(async () => {
    const service = createService({ dailyCount: config.dailyLimit });

    const result = await service.getEligibility(wallet);

    assert.equal(result.eligible, false);
    assert.equal(result.reason, "The faucet daily limit has been reached.");
  });
});

test("rejects a wallet that is still on cooldown", async () => {
  await withClaimsEnabled(async () => {
    const service = createService({
      latestClaim: {
        status: "CONFIRMED",
        createdAt: new Date(),
        confirmedAt: new Date(),
      },
    });

    const result = await service.getEligibility(wallet);

    assert.equal(result.eligible, false);
    assert.equal(result.reason, "The wallet is still on cooldown.");
    assert.ok(result.nextClaimAt instanceof Date);
  });
});

test("allows an eligible wallet and returns the configured claim amount", async () => {
  await withClaimsEnabled(async () => {
    const service = createService();

    const result = await service.getEligibility(wallet);

    assert.equal(result.eligible, true);
    assert.equal(result.claimAmount, config.claimAmount.toString());
  });
});

test("reports missing faucet configuration", async () => {
  await withClaimsEnabled(async () => {
    const service = createService({ faucetConfig: null });

    await assert.rejects(
      () => service.getEligibility(wallet),
      ServiceUnavailableException,
    );
  });
});
