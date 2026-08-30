const url = process.env.BENTCRYPTO_MCP_URL || "https://api.bentcrypto.com/mcp";
const version = "2026-07-28";

const body = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {
    _meta: {
      "io.modelcontextprotocol/protocolVersion": version,
      "io.modelcontextprotocol/clientInfo": { name: "bentcrypto-example", version: "1.0.0" },
      "io.modelcontextprotocol/clientCapabilities": {},
    },
  },
};

const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": version,
    "Mcp-Method": "tools/list",
  },
  body: JSON.stringify(body),
});

if (!response.ok) throw new Error(`BentCrypto MCP HTTP ${response.status}: ${await response.text()}`);
const result = await response.json();
console.log(JSON.stringify(result?.result?.tools || [], null, 2));
