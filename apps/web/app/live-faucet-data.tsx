"use client";

import { useEffect, useState } from "react";
import styles from "./live-faucet-data.module.css";

type Claim = {
  id: string;
  walletAddress: string;
  amount: string;
  status: string;
  createdAt: string;
  txHash: string | null;
};

type HistoryResponse = Claim[] | { value?: Claim[] };

type Props = {
  onViewAll?: () => void;
  showAll?: boolean;
};

export default function LiveFaucetData({ onViewAll, showAll = false }: Props) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [historyState, setHistoryState] = useState("loading");

  useEffect(() => {
    let active = true;
    let loading = false;

    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const response = await fetch(
          `/api/faucet/history?limit=${showAll ? 100 : 4}`,
          {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("History unavailable");
        const data: HistoryResponse = await response.json();
        const records = Array.isArray(data) ? data : data.value;
        if (active) {
          setClaims(
            Array.isArray(records)
              ? records.filter(
                  (claim) =>
                    claim.status.toUpperCase() === "CONFIRMED"
                )
              : []
          );
          setHistoryState("ready");
        }
      } catch {
        if (active) setHistoryState("error");
      } finally {
        loading = false;
      }
    };

    void load();

    const onClaimConfirmed = () => void load();
    window.addEventListener("faucet:claim-confirmed", onClaimConfirmed);

    const timer = setInterval(() => void load(), 1000);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("faucet:claim-confirmed", onClaimConfirmed);
    };
  }, [showAll]);

  function formatAddress(address: string) {
    if (!address) return "Unknown wallet";
    if (address.length <= 9) return address;
    return `${address.slice(0, 4)}...${address.slice(-3)}`;
  }

  function formatAmount(amount: string) {
    try {
      return (
        Number(BigInt(amount) / 100000000000000n) +
        " tPOTv3"
      );
    } catch {
      return "tPOTv3";
    }
  }

  function formatStatus(status: string) {
    return status.replace(/[_-]+/g, " ").toLowerCase();
  }

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>TRANSPARENCY BY DEFAULT</span>
          <h2>{showAll ? "All activity" : "Recent activity"}</h2>
          <p className={styles.subtitle}>
            {showAll
              ? "Browse recent faucet claim records and their status."
              : "A live view of the latest faucet claim records."}
          </p>
        </div>
        <button
          className={styles.viewAll}
          type="button"
          onClick={onViewAll}
          disabled={!onViewAll}
        >
          View all activity <span aria-hidden="true">↗</span>
        </button>
      </div>

      <div className={styles.historyHeading}>
        <span>{showAll ? "Transaction history" : "Latest claims"}</span>
        <span className={styles.recordCount}>
          {historyState === "loading"
            ? "Loading"
            : historyState === "error"
              ? "Unavailable"
              : `${claims.length} records`}
        </span>
      </div>

      {historyState === "error" ? (
        <p className={styles.empty}>
          Claim history could not be loaded. Please try again later.
        </p>
      ) : historyState === "loading" ? (
        <p className={styles.empty}>Loading recent claims...</p>
      ) : claims.length === 0 ? (
        <p className={styles.empty}>
          No claims recorded yet. Verified claim records will appear here.
        </p>
      ) : (
        <div className={styles.claims}>
          {(showAll ? claims : claims.slice(0, 4)).map((claim) => (
            <article className={styles.claim} key={claim.id}>
              <div className={styles.claimIcon} aria-hidden="true">↗</div>
              <div className={styles.claimInfo}>
                <strong>{formatAddress(claim.walletAddress)}</strong>
                <span title={claim.walletAddress}>
                  {formatAmount(claim.amount)} ? {new Date(claim.createdAt).toLocaleString()}
                </span>
              </div>
              <span
                className={`${styles.status} ${
                  claim.status.toLowerCase() === "confirmed"
                    ? styles.statusConfirmed
                    : claim.status.toLowerCase() === "failed"
                      ? styles.statusFailed
                      : styles.statusPending
                }`}
              >
                {formatStatus(claim.status)}
              </span>
            </article>
          ))}
        </div>
      )}

      <div className={styles.activityFooter}>
        <span>Live backend records</span>
        <span>Read only</span>
      </div>
    </section>
  );
}
