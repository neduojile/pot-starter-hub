import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('FaucetConfig', 'FaucetClaim')
    ORDER BY table_name;
  `);

  console.log("Faucet tables:");
  console.table(result.rows);

  const indexes = await pool.query(`
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('FaucetConfig', 'FaucetClaim')
    ORDER BY tablename, indexname;
  `);

  console.log("Faucet indexes:");
  console.table(indexes.rows);

  if (result.rows.length !== 2) {
    throw new Error("Expected both faucet tables to exist.");
  }
} finally {
  await pool.end();
}
