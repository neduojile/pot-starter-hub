import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws";
import { portaldotV3 } from "../../../.papi/descriptors/dist/index.js";

export const portaldotClient = createClient(
  getWsProvider("wss://test-node-v3.portaldot.dev"),
);

export const portaldotApi = portaldotClient.getTypedApi(portaldotV3);

export async function getPortaldotChainInfo(): Promise<{ name: string; genesisHash: string; properties: unknown }> {
  return await portaldotClient.getChainSpecData();
}

export async function getPortaldotAccountBalance(address: string) {
  const account = await portaldotApi.query.System.Account.getValue(address);
  return {
    address,
    free: account.data.free,
    reserved: account.data.reserved,
    frozen: account.data.frozen,
    nonce: account.nonce,
  };
}

