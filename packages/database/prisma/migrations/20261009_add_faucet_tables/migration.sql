CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

CREATE TABLE "FaucetConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "claimAmount" BIGINT NOT NULL DEFAULT 1000000000000000,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 86400,
    "dailyLimit" INTEGER NOT NULL DEFAULT 100,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FaucetConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FaucetClaim" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    CONSTRAINT "FaucetClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FaucetClaim_txHash_key"
ON "FaucetClaim"("txHash");

CREATE INDEX "FaucetClaim_walletAddress_createdAt_idx"
ON "FaucetClaim"("walletAddress", "createdAt");

CREATE INDEX "FaucetClaim_status_createdAt_idx"
ON "FaucetClaim"("status", "createdAt");
