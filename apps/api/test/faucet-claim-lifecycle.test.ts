import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ConflictException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { encodeAddress } from "@polkadot/util-crypto";
import { FaucetService } from "../src/faucet.service.js";

const publicKey = Uint8Array.from(
  Buffer.from(
    "d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d",
    "hex",
  ),
);

const wallet = encodeAddress(publicKey, 42);
const txHash = "0x" + "a".repeat(64);
const blockHash = "0x" + "b".repeat(64);

const config = {
  claimAmount: 1000000000000000n,
  cooldownSeconds: 86400,
  dailyLimit: 100,
  paused: false,
};

function createHarness(options: { latestClaim?: any } = {}) {
  const updates: any[] = [];

  const record: any = {
    id: "test-claim-001",
    walletAddress: wallet,
    amount: config.claimAmount,
    status: "PENDING",
    txHash: null,
    blockHash: null,
    confirmedAt: null,
  };

  const txDb = {
    $executeRaw: async () => 1,
    faucetConfig: {
      findUnique: async () => config,
    },
    faucetClaim: {
      findFirst: async () => options.latestClaim ?? null,
      count: async () => 0,
      create: async () => ({ ...record }),
    },
  };

  const client = {
    ...txDb,
    $transaction: async (callback: (db: any) => Promise<any>) =>
      callback(txDb),
    faucetClaim: {
      ...txDb.faucetClaim,
      update: async ({ data }: { data: any }) => {
        updates.push(data);
        Object.assign(record, data);
        return { ...record };
      },
    },
  };

  const database = {
    get client() {
      return client;
    },
  };

  return {
    service: new FaucetService(database as any, {} as any),
    updates,
    record,
  };
}

async function withAdapter(
  result: any,
  callback: (harness: ReturnType<typeof createHarness>) => Promise<void>,
  includeEvent = true,
  options: { latestClaim?: any } = {},
) {
  const directory = await mkdtemp(join(tmpdir(), "pot-faucet-test-"));
  const adapterPath = join(directory, "fake-adapter.cjs");

  const lines = [];

  if (includeEvent) {
    lines.push(JSON.stringify({
      event: "included",
      txHash,
      blockHash,
    }));
  }

  lines.push(JSON.stringify(result));

  const output = lines.join("\n") + "\n";

  await writeFile(
    adapterPath,
    `process.stdout.write(${JSON.stringify(output)});`,
    "utf8",
  );

  const previousEnabled = process.env.FAUCET_CLAIMS_ENABLED;
  const previousAdapter = process.env.POT_TRANSFER_ADAPTER_PATH;

  process.env.FAUCET_CLAIMS_ENABLED = "true";
  process.env.POT_TRANSFER_ADAPTER_PATH = adapterPath;

  try {
    await callback(createHarness(options));
  } finally {
    if (previousEnabled === undefined) {
      delete process.env.FAUCET_CLAIMS_ENABLED;
    } else {
      process.env.FAUCET_CLAIMS_ENABLED = previousEnabled;
    }

    if (previousAdapter === undefined) {
      delete process.env.POT_TRANSFER_ADAPTER_PATH;
    } else {
      process.env.POT_TRANSFER_ADAPTER_PATH = previousAdapter;
    }

    await rm(directory, { recursive: true, force: true });
  }
}

test("confirms a finalized successful claim and persists transaction details", async () => {
  await withAdapter(
    { ok: true, finalized: true, txHash, blockHash },
    async ({ service, updates, record }) => {
      const result = await service.claim(wallet);

      assert.equal(result.status, "CONFIRMED");
      assert.equal(result.txHash, txHash);
      assert.equal(result.blockHash, blockHash);
      assert.equal(result.amount, config.claimAmount.toString());

      assert.equal(updates.length, 2);
      assert.deepEqual(updates[0], { txHash, blockHash });
      assert.equal(updates[1].status, "CONFIRMED");
      assert.equal(updates[1].txHash, txHash);
      assert.equal(updates[1].blockHash, blockHash);
      assert.ok(updates[1].confirmedAt instanceof Date);

      assert.equal(record.status, "CONFIRMED");
      assert.equal(record.blockHash, blockHash);
    },
  );
});

test("persists the finalized block hash when the inclusion event was missed", async () => {
  await withAdapter(
    { ok: true, finalized: true, txHash, blockHash },
    async ({ service, updates, record }) => {
      const result = await service.claim(wallet);

      assert.equal(result.status, "CONFIRMED");
      assert.equal(result.blockHash, blockHash);
      assert.equal(record.blockHash, blockHash);
      assert.equal(updates.length, 1);
      assert.equal(updates[0].blockHash, blockHash);
    },
    false,
  );
});



test("marks a finalized dispatch failure as FAILED", async () => {
  await withAdapter(
    {
      ok: false,
      finalized: true,
      txHash,
      blockHash,
      failureReason: "Insufficient balance",
    },
    async ({ service, updates, record }) => {
      await assert.rejects(
        () => service.claim(wallet),
        ServiceUnavailableException,
      );

      assert.equal(record.status, "FAILED");
      assert.equal(record.txHash, txHash);
      assert.equal(record.failureReason, "Insufficient balance");
      assert.equal(updates[1].status, "FAILED");
      assert.equal(updates[1].blockHash, blockHash);
      assert.equal(updates[1].blockHash, blockHash);
      assert.equal(updates[1].blockHash, blockHash);
    },
  );
});

test("keeps a claim pending when the final result has no transaction hash", async () => {
  await withAdapter(
    { ok: true, finalized: true },
    async ({ service, updates, record }) => {
      await assert.rejects(
        () => service.claim(wallet),
        ServiceUnavailableException,
      );

      assert.equal(record.status, "PENDING");
      assert.equal(record.txHash, null);
      assert.equal(updates.length, 0);
    },
    false,
  );
});

test("does not submit another transaction when a claim is already pending", async () => {
  await withAdapter(
    { ok: true, finalized: true, txHash, blockHash },
    async ({ service, updates }) => {
      await assert.rejects(
        () => service.claim(wallet),
        ConflictException,
      );

      assert.equal(updates.length, 0);
    },
    true,
    {
      latestClaim: {
        id: "existing-claim",
        status: "PENDING",
        createdAt: new Date(),
      },
    },
  );
});
