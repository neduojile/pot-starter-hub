import "dotenv/config";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from packages/database/.env");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const expectedObjects = [
  'public."ClaimStatus"',
  'public."FaucetConfig"',
  'public."FaucetClaim"',
  'public."FaucetClaim_txHash_key"',
  'public."FaucetClaim_walletAddress_createdAt_idx"',
  'public."FaucetClaim_status_createdAt_idx"',
];

const client = await pool.connect();

try {
  const checks = await client.query(
    `SELECT
      to_regtype($1) IS NOT NULL AS enum_exists,
      to_regclass($2) IS NOT NULL AS config_exists,
      to_regclass($3) IS NOT NULL AS claim_exists,
      to_regclass($4) IS NOT NULL AS tx_index_exists,
      to_regclass($5) IS NOT NULL AS wallet_index_exists,
      to_regclass($6) IS NOT NULL AS status_index_exists`,
    expectedObjects
  );

  const exists = Object.values(checks.rows[0]);
  const existingCount = exists.filter(Boolean).length;

  if (existingCount === expectedObjects.length) {
    console.log("Faucet database objects already exist. Nothing to apply.");
  } else if (existingCount > 0) {
    throw new Error(
      "Some faucet objects already exist. No SQL was applied; inspect the database before proceeding."
    );
  } else {
    const sql = await readFile(
      resolve("prisma/migrations/20261009_add_faucet_tables/migration.sql"),
      "utf8"
    );

    await client.query("BEGIN");

    try {
      await client.query(sql);
      await client.query("COMMIT");
      console.log("Faucet tables and indexes created successfully.");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  client.release();
  await pool.end();
}
