"use client";

import { useEffect, useState } from "react";
import {
  connectInjectedExtension,
  getInjectedExtensions,
} from "polkadot-api/pjs-signer";
import styles from "./wallet-connect.module.css";

type Wallet = Awaited<ReturnType<typeof connectInjectedExtension>>;
type WalletAccount = ReturnType<Wallet["getAccounts"]>[number];

export default function WalletConnect() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [extensions, setExtensions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!wallet) return;

    const updateAccounts = (nextAccounts: WalletAccount[]) => {
      setAccounts(nextAccounts);
      setSelectedAddress((current) =>
        nextAccounts.some((account) => account.address === current)
          ? current
          : nextAccounts[0]?.address ?? "",
      );
    };

    updateAccounts(wallet.getAccounts());

    const unsubscribe = wallet.subscribe(updateAccounts);

    return () => {
      unsubscribe();
      wallet.disconnect();
    };
  }, [wallet]);

  async function openWalletPicker() {
    setError("");
    setOpen(true);

    if (wallet) return;

    try {
      const available = getInjectedExtensions();
      setExtensions(available);

      if (available.length === 0) {
        setError(
          "No compatible wallet extension was detected. Install a compatible Substrate wallet and refresh this page.",
        );
      }
    } catch {
      setError("Could not detect wallet extensions.");
    }
  }

  async function connect(name: string) {
    setBusy(true);
    setError("");

    try {
      const connected = await connectInjectedExtension(name);
      const availableAccounts = connected.getAccounts();

      if (availableAccounts.length === 0) {
        connected.disconnect();
        setError(
          "The wallet connected, but no accounts were shared. Enable an account in your wallet and try again.",
        );
        return;
      }

      setAccounts(availableAccounts);
      setSelectedAddress(availableAccounts[0]?.address ?? "");
      setWallet(connected);
      setExtensions([]);
    } catch {
      setError(
        "Wallet connection was cancelled or failed. Check your wallet and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    setWallet(null);
    setAccounts([]);
    setSelectedAddress("");
    setExtensions([]);
    setError("");
    setOpen(false);
  }

  const connected = Boolean(wallet && selectedAddress);
  const shortAddress = selectedAddress
    ? `${selectedAddress.slice(0, 7)}…${selectedAddress.slice(-6)}`
    : "";

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            void openWalletPicker();
          }
        }}
        disabled={busy}
        aria-expanded={open}
      >
        <span className={connected ? styles.connectedDot : styles.dot} />
        {busy
          ? "Connecting…"
          : connected
            ? shortAddress
            : "Connect wallet"}
      </button>

      {open && (
        <div className={styles.popover}>
          <div className={styles.popoverHeader}>
            <div>
              <strong>{connected ? "Your wallet" : "Connect a wallet"}</strong>
              <p>
                {connected
                  ? "Choose an account or disconnect."
                  : "Select an installed wallet extension."}
              </p>
            </div>
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
              aria-label="Close wallet menu"
            >
              ×
            </button>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {connected && (
            <>
              <div className={styles.accountList}>
                {accounts.map((account) => (
                  <button
                    type="button"
                    key={account.address}
                    className={
                      account.address === selectedAddress
                        ? styles.selectedAccount
                        : styles.account
                    }
                    onClick={() => setSelectedAddress(account.address)}
                  >
                    <span className={styles.accountName}>
                      {account.name || "Wallet account"}
                    </span>
                    <span className={styles.address}>
                      {account.address}
                    </span>
                    {account.address === selectedAddress && (
                      <span className={styles.selectedMark}>Selected</span>
                    )}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={styles.disconnect}
                onClick={disconnect}
              >
                Disconnect wallet
              </button>
            </>
          )}

          {!connected &&
            extensions.map((name) => (
              <button
                type="button"
                key={name}
                className={styles.extension}
                disabled={busy}
                onClick={() => void connect(name)}
              >
                <span className={styles.walletGlyph}>◈</span>
                <span>{name}</span>
                <span className={styles.arrow}>↗</span>
              </button>
            ))}

          <p className={styles.footnote}>
            Non-custodial connection. Never share your recovery phrase.
            Connecting does not authorize a transaction.
          </p>
        </div>
      )}
    </div>
  );
}

