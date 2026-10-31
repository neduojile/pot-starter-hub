import { checkAddress } from "@polkadot/util-crypto";

export function normalizeWalletAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const address = value.trim();

  if (!address || address.length > 128) return null;

  try {
    return checkAddress(address, 42)[0] ? address : null;
  } catch {
    return null;
  }
}
