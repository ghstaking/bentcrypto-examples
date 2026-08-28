import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { BASE_MAINNET, BASE_USDC } from "../lib.mjs";

function challengeHeader(resourceUrl) {
  const challenge = {
    x402Version: 2,
    resource: { url: resourceUrl },
    accepts: [
      {
        scheme: "exact",
        network: BASE_MAINNET,
        amount: "10000",
        asset: BASE_USDC,
        payTo: "0x0000000000000000000000000000000000000001",
        maxTimeoutSeconds: 60,
      },
    ],
  };
  return Buffer.from(JSON.stringify(challenge), "utf8").toString("base64");
}

async function startMockApi() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    res.setHeader("content-type", "application/json");

    if (url.pathname === "/v1/token/risk") {
      const resourceUrl = `http://127.0.0.1:${server.address().port}${req.url}`;
      res.statusCode = 402;
      res.setHeader("payment-required", challengeHeader(resourceUrl));
      res.end(JSON.stringify({ error: "payment_required" }));
      return;
    }

    if (url.pathname === "/") {
      res.end(JSON.stringify({ service: "BentCrypto", products: ["token_risk", "token_security"] }));
      return;
    }
    if (url.pathname === "/pricing") {
      res.end(JSON.stringify({ token_risk: { price_usd: 0.01 }, token_security: { price_usd: 0.01 } }));
      return;
    }
    if (url.pathname === "/openapi.json") {
      res.end(JSON.stringify({ openapi: "3.1.0", info: { title: "BentCrypto mock", version: "test" } }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not_found" }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}

function textPayload(result) {
  const item = result?.content?.find((entry) => entry.type === "text");
  return item ? JSON.parse(item.text) : null;
}

test("stdio MCP host can discover, preview 402, and preserves payment-off safety", async (t) => {
  const mock = await startMockApi();
  t.after(() => mock.close());

  const origin = `http://127.0.0.1:${mock.address().port}`;
  const serverPath = new URL("../server.mjs", import.meta.url).pathname;
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: {
      ...process.env,
      BENTCRYPTO_API_URL: origin,
      BENTCRYPTO_ALLOW_CUSTOM_ORIGIN: "YES",
      BENTCRYPTO_ALLOW_PAYMENTS: "NO",
    },
  });
  const client = new Client({ name: "bentcrypto-mcp-integration-test", version: "1.0.0" }, { capabilities: {} });
  t.after(async () => {
    try { await client.close(); } catch {}
  });

  await client.connect(transport);

  const listed = await client.listTools();
  const names = new Set(listed.tools.map((tool) => tool.name));
  for (const expected of ["discover_bentcrypto", "preview_token_risk_payment", "token_risk", "token_security"]) {
    assert.equal(names.has(expected), true, `missing MCP tool ${expected}`);
  }

  const discovery = await client.callTool({ name: "discover_bentcrypto", arguments: {} });
  assert.equal(discovery.isError, undefined);
  const discoveryBody = textPayload(discovery);
  assert.equal(discoveryBody.origin, origin);
  assert.equal(discoveryBody.pricing.token_risk.price_usd, 0.01);

  const address = "0x4200000000000000000000000000000000000006";
  const preview = await client.callTool({
    name: "preview_token_risk_payment",
    arguments: { chain: "base", address },
  });
  assert.equal(preview.isError, undefined);
  const previewBody = textPayload(preview);
  assert.equal(previewBody.status, 402);
  assert.equal(previewBody.challenge.x402Version, 2);
  assert.equal(previewBody.challenge.accepts[0].network, BASE_MAINNET);
  assert.equal(previewBody.challenge.accepts[0].amount, "10000");
  assert.equal(previewBody.challenge.accepts[0].asset, BASE_USDC);

  const paidWhileDisabled = await client.callTool({
    name: "token_risk",
    arguments: { chain: "base", address },
  });
  assert.equal(paidWhileDisabled.isError, true);
  assert.match(paidWhileDisabled.content[0].text, /Payments are disabled/);
});
