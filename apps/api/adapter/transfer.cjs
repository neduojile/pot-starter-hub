const { ApiPromise, WsProvider } = require("@polkadot/api");
const { Keyring } = require("@polkadot/keyring");
const { cryptoWaitReady } = require("@polkadot/util-crypto");
require("dotenv").config();

const RPC = "wss://test-node-v3.portaldot.dev";
const GENESIS =
  "0xd4f9acbcf7f52388d8b095abe3c198d19fc510e0343e643e87cfbccb155283bd";

function output(value) {
  process.stdout.write(JSON.stringify(value) + "\n");
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;

  const request = JSON.parse(input || "{}");
  const recipient = request.recipient;
  const amount = BigInt(request.amount || "0");
  const submit = request.action === "submit";

  if (!recipient || amount <= 0n) {
    throw new Error("A valid recipient and positive amount are required.");
  }

  const secretUri = process.env.FAUCET_SIGNER_URI?.trim();
  const expectedAddress = process.env.FAUCET_ADDRESS?.trim();

  if (!secretUri || !expectedAddress) {
    throw new Error("Faucet signer configuration is missing.");
  }

  await cryptoWaitReady();
  const keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
  const pair = keyring.addFromUri(secretUri, {}, "sr25519");

  if (pair.address !== expectedAddress) {
    throw new Error("Faucet signer address verification failed.");
  }

  const provider = new WsProvider(RPC);
  let api;

  try {
    api = await ApiPromise.create({ provider });

    if (api.genesisHash.toHex().toLowerCase() !== GENESIS.toLowerCase()) {
      throw new Error("Unexpected chain genesis hash.");
    }

    const recipientCheck = require("@polkadot/util-crypto").decodeAddress(recipient);
    if (recipientCheck.length !== 32) {
      throw new Error("Recipient address is invalid.");
    }

    const account = await api.query.system.account(pair.address);
    const free = BigInt(account.data.free.toString());
    const transfer = api.tx.balances.transferAllowDeath(
      recipient,
      amount.toString(),
    );
    const feeInfo = await transfer.paymentInfo(pair);
    const fee = BigInt(feeInfo.partialFee.toString());

    if (free < amount + fee) {
      throw new Error("Insufficient faucet balance for payout and estimated fee.");
    }

    if (!submit) {
      output({
        ok: true,
        submitted: false,
        faucetAddress: pair.address,
        recipient,
        amount: amount.toString(),
        estimatedFee: fee.toString(),
        freeBalance: free.toString(),
      });
      return;
    }

    let unsubscribe;
    let settled = false;
    let hashReported = false;

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("Submission outcome uncertain; keep claim pending for reconciliation."));
        }
      }, 120000);

      transfer.signAndSend(pair, { nonce: -1 }, (status) => {
        const observedHash = status.txHash?.toHex();

        if (
          !hashReported &&
          observedHash &&
          (status.status.isInBlock || status.status.isFinalized)
        ) {
          hashReported = true;
          const includedBlockHash = status.status.isFinalized
            ? status.status.asFinalized.toHex()
            : status.status.asInBlock.toHex();

          output({
            event: "included",
            txHash: observedHash,
            blockHash: includedBlockHash
          });
        }

        if (!status.status.isFinalized || settled) return;

        settled = true;
        clearTimeout(timeout);

        (async () => {
          const txHash = status.txHash?.toHex();
          if (!txHash) {
            throw new Error("Finalized status did not include an extrinsic hash.");
          }

          const finalizedHash = status.status.asFinalized;
          const block = await api.rpc.chain.getBlock(finalizedHash);
          const index = block.block.extrinsics.findIndex(
            (item) => item.hash.toHex() === txHash
          );

          if (index < 0) {
            throw new Error("Finalized extrinsic was not found in its block.");
          }

          const events = await api.query.system.events.at(finalizedHash);
          const related = events.filter(
            ({ phase }) =>
              phase.isApplyExtrinsic &&
              phase.asApplyExtrinsic.toNumber() === index
          );

          const failed = related.find(
            ({ event }) =>
              event.section === "system" &&
              event.method === "ExtrinsicFailed"
          );

          if (failed) {
            const dispatchError = failed.event.data[0];
            let reason = dispatchError.toString();

            if (dispatchError.isModule) {
              try {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                reason = decoded.section + "." + decoded.name + ": " +
                  decoded.docs.join(" ");
              } catch {}
            }

            resolve({
              ok: false,
              finalized: true,
              txHash,
              failureReason: reason
            });
            return;
          }

          const success = related.some(
            ({ event }) =>
              event.section === "system" &&
              event.method === "ExtrinsicSuccess"
          );

          if (!success) {
            throw new Error("Finalized transaction has no ExtrinsicSuccess event.");
          }

          resolve({ ok: true, finalized: true, txHash });
        })().catch((error) => {
          reject(error);
        });
      }).then((unsub) => {
        unsubscribe = unsub;
        if (settled && unsubscribe) unsubscribe();
      }).catch((error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(error);
        }
      });
    });

    if (unsubscribe) unsubscribe();
    output(result);
  } finally {
    if (api) await api.disconnect();
    else await provider.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  output({ ok: false, error: error.message || "Adapter failed." });
  process.exitCode = 1;
});



