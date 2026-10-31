import test from "node:test";
import assert from "node:assert/strict";
import { encodeAddress } from "@polkadot/util-crypto";
import { normalizeWalletAddress } from "../src/faucet-validation.js";

const publicKey = Uint8Array.from(
  Buffer.from(
    "d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d",
    "hex",
  ),
);

const validAddress = encodeAddress(publicKey, 42);

test("accepts a valid Portaldot SS58 address", () => {
  assert.equal(normalizeWalletAddress(validAddress), validAddress);
});

test("trims whitespace around a valid address", () => {
  assert.equal(normalizeWalletAddress(`  ${validAddress}  `), validAddress);
});

test("rejects an empty address", () => {
  assert.equal(normalizeWalletAddress("   "), null);
});

test("rejects a malformed address", () => {
  assert.equal(normalizeWalletAddress("not-a-wallet-address"), null);
});

test("rejects an address longer than 128 characters", () => {
  assert.equal(normalizeWalletAddress("a".repeat(129)), null);
});
