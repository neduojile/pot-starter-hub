import { getPortaldotChainInfo } from "./client.js";

const chain = await getPortaldotChainInfo();

console.log("Portaldot V3 connected");
console.log("Chain name:", chain.name);
console.log("Genesis hash:", chain.genesisHash);
console.log("Properties:", chain.properties);
