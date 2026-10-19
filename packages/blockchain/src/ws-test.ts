import WebSocket from "ws";

const url = "wss://test-node-v3.portaldot.dev";

console.log("Connecting to Portaldot V3...");
const ws = new WebSocket(url);

let finished = false;

const timeout = setTimeout(() => {
  if (finished) return;
  finished = true;
  console.error("FAILED: No complete RPC response within 15 seconds.");
  ws.terminate();
  process.exitCode = 1;
}, 15000);

ws.on("open", () => {
  console.log("WebSocket connected.");
  console.log("Requesting chain name...");

  ws.send(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "system_chain",
    params: [],
  }));
});

ws.on("message", (data) => {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);

  console.log("RPC response:");
  console.log(data.toString());

  ws.close();
});

ws.on("error", (error) => {
  if (finished) return;
  finished = true;
  clearTimeout(timeout);

  console.error("FAILED: WebSocket error:", error.message);
  process.exitCode = 1;
});

ws.on("close", () => {
  if (!finished) {
    finished = true;
    clearTimeout(timeout);
    console.error("FAILED: Connection closed before an RPC response.");
    process.exitCode = 1;
  } else {
    console.log("WebSocket closed.");
  }
});

