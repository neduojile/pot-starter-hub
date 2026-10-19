"use client";

import { useEffect, useState } from "react";
import styles from "./wallet-address-checker.module.css";

type Eligibility = {
  eligible?: boolean;
  reason?: string;
  nextClaimAt?: string | null;
};

type ClaimResult = {
  id?: string;
  status?: string;
  txHash?: string | null;
  amount?: string;
  message?: string;
};

export default function WalletAddressChecker() {
  const [address, setAddress] = useState("");
  const [verified, setVerified] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [checking, setChecking] = useState<
    "verify" | "balance" | "claim" | null
  >(null);
  const [message, setMessage] = useState("");
  const [balance, setBalance] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [nextClaimAt, setNextClaimAt] = useState<number | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = nextClaimAt === null
    ? 0
    : Math.max(0, Math.ceil((nextClaimAt - now) / 1000));

  const countdown = [
    Math.floor(remaining / 3600),
    Math.floor((remaining % 3600) / 60),
    remaining % 60,
  ].map((part) => String(part).padStart(2, "0"));
  const countdownLabel = `${countdown[0]}h ${countdown[1]}m ${countdown[2]}s`;

  function updateAddress(value: string) {
    setAddress(value);
    setVerified(false);
    setEligible(false);
    setBalance(null);
    setMessage("");
    setIsError(false);
    setNextClaimAt(null);
    setClaimResult(null);
  }

  async function refreshEligibility(value: string): Promise<boolean> {
    const response = await fetch(
      `/api/faucet/eligibility/${encodeURIComponent(value)}`,
      { cache: "no-store" },
    );
    const data: Eligibility & { message?: string } = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? "Eligibility check failed.");
    }

    setNextClaimAt(
      data.nextClaimAt ? new Date(data.nextClaimAt).getTime() : null,
    );

    const canClaim = data.eligible === true;
    setEligible(canClaim);

    if (canClaim) {
      setMessage("Address verified. This wallet is eligible to claim.");
    } else {
      setMessage(data.reason ?? "This wallet is not currently eligible.");
    }

    return canClaim;
  }

  async function verifyAddress() {
    const value = address.trim();
    setVerified(false);
    setEligible(false);
    setBalance(null);
    setMessage("");
    setIsError(false);
    setClaimResult(null);

    if (!value) {
      setMessage("Enter your native wallet address first.");
      setIsError(true);
      return;
    }

    setChecking("verify");

    try {
      const response = await fetch(
        `/api/chain/verify?address=${encodeURIComponent(value)}`,
        { cache: "no-store" },
      );
      const data = await response.json();

      if (!response.ok || !data.valid) {
        throw new Error(data.message ?? "Address verification failed.");
      }

      setVerified(true);
      await refreshEligibility(value);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Could not verify this address.",
      );
    } finally {
      setChecking(null);
    }
  }

  async function checkBalance() {
    const value = address.trim();
    setBalance(null);
    setMessage("");
    setIsError(false);

    if (!value) {
      setMessage("Enter your native wallet address first.");
      setIsError(true);
      return;
    }

    setChecking("balance");

    try {
      const response = await fetch(
        `/api/chain/balance?address=${encodeURIComponent(value)}`,
        { cache: "no-store" },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Could not check the balance.");
      }

      setVerified(true);
      setBalance(`${data.free} ${data.symbol}`);
      setMessage("Live balance retrieved from Portaldot V3.");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not read the live balance. Try again later.",
      );
    } finally {
      setChecking(null);
    }
  }

  async function claimTokens() {
    const value = address.trim();

    if (!verified || !eligible || !value) {
      setMessage("Verify your address and eligibility before claiming.");
      setIsError(true);
      return;
    }

    setChecking("claim");
    setMessage("");
    setIsError(false);
    setClaimResult(null);

    try {
      // Recheck eligibility immediately before submitting the claim.
      const stillEligible = await refreshEligibility(value);

      if (!stillEligible) {
        setIsError(true);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      let response: Response;

      try {
        response = await fetch("/api/faucet/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: value }),
          cache: "no-store",
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(
            "The claim request is taking too long. Check claim history before retrying."
          );
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }

      const data: ClaimResult = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "The faucet claim was unsuccessful.");
      }

      setClaimResult(data);

      if (data.status === "CONFIRMED" && data.txHash) {
        setMessage("Claim confirmed on Portaldot V3.");
        setEligible(false);
        await refreshEligibility(value);
      } else {
        setMessage(
          "The claim request was submitted, but confirmation is not available yet. Check claim history before trying again.",
        );
      }
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not complete the claim. Check claim history before retrying.",
      );
    } finally {
      setChecking(null);
    }
  }

  return (
    <div className={styles.checker}>
      <label htmlFor="native-wallet-address">Native wallet address</label>
      <input
        id="native-wallet-address"
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="Enter address starting with 5..."
        value={address}
        onChange={(event) => updateAddress(event.target.value)}
        aria-describedby="address-help"
      />

      <p id="address-help" className={styles.help}>
        Use your Portaldot V3 native address, not an EVM 0x address.
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={verifyAddress}
          disabled={checking !== null}
          className={styles.primary}
        >
          {checking === "verify" ? "Verifying..." : "Verify eligibility"}
        </button>

        <button
          type="button"
          onClick={checkBalance}
          disabled={checking !== null}
          className={styles.secondary}
        >
          {checking === "balance" ? "Checking..." : "Check balance"}
        </button>
      </div>

      {verified && eligible && (
        <button
          type="button"
          onClick={claimTokens}
          disabled={checking !== null || remaining > 0}
          className={styles.mobileClaimFallback}
        >
          {checking === "claim" ? "Submitting claim..." : "Claim 10 tPOT"}
        </button>
      )}

      {nextClaimAt !== null && remaining > 0 && (
        <div className={styles.countdown} aria-live="off">
          <span>Time until next claim</span>
          <strong>{countdownLabel}</strong>
        </div>
      )}

      {verified && balance !== null && (
        <div className={styles.balance}>
          <span>Available balance</span>
          <strong>{balance}</strong>
        </div>
      )}

      {claimResult?.txHash && (
        <div className={styles.balance}>
          <span>Transaction hash</span>
          <strong style={{ overflowWrap: "anywhere" }}>
            {claimResult.txHash}
          </strong>
          <button
            type="button"
            className={styles.secondary}
            onClick={() =>
              window.open(
                `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Ftest-node-v3.portaldot.dev#/explorer/query/${claimResult.txHash}`,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            View transaction
          </button>
        </div>
      )}

      {message && (
        <p
          className={`${styles.message} ${isError ? styles.error : styles.success}`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}


