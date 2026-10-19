import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { getPortaldotAccountBalance } from "./client.js";

const rl = createInterface({ input: stdin, output: stdout });

function formatTpot(value: bigint): string {
  const decimals = 14n;
  const whole = value / 10n ** decimals;
  const fraction = (value % 10n ** decimals)
    .toString()
    .padStart(Number(decimals), "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole.toString();
}

try {
  const address = (await rl.question("Enter your native POT address (starts with 5): ")).trim();

  if (!address.startsWith("5") || address.length < 40 || address.length > 60) {
    throw new Error("That does not look like a native SS58 address. Check the address and try again.");
  }

  console.log("Reading account balance from Portaldot V3...");
  const account = await getPortaldotAccountBalance(address);

  console.log("\nAccount balance retrieved:");
  console.log("Native address:", account.address);
  console.log("Free:", formatTpot(account.free), "tPOT");
  console.log("Reserved:", formatTpot(account.reserved), "tPOT");
  console.log("Frozen:", formatTpot(account.frozen), "tPOT");
  console.log("Nonce:", account.nonce);
} catch (error) {
  console.error(
    "Balance check failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
} finally {
  rl.close();
}
