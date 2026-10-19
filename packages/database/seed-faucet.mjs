import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client.ts";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from packages/database/.env");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

try {
  const config = await prisma.faucetConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      claimAmount: 1000000000000000n,
      cooldownSeconds: 86400,
      dailyLimit: 100,
      paused: false,
    },
  });

  console.log("Default faucet configuration verified:");
  console.log({
    id: config.id,
    claimAmount: config.claimAmount.toString(),
    cooldownSeconds: config.cooldownSeconds,
    dailyLimit: config.dailyLimit,
    paused: config.paused,
  });
} finally {
  await prisma.$disconnect();
}
