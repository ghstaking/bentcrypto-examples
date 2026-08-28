#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { privateKeyToAccount } from "viem/accounts";
import { base58 } from "@scure/base";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import {
  BASE_MAINNET,
  CANONICAL_API_ORIGIN,
  SOLANA_MAINNET,
  apiOrigin,
  chooseRequirement,
  decodePaymentHeader,
  maxPaymentBaseUnits,
  sanitizeChallenge,
  validateTokenAddress,
} from "./lib.mjs";

const VERSION = "0.1.0";
const origin = apiOrigin();
const maxBaseUnits = maxPaymentBaseUnits();
const paymentsEnabled = process.env.BENTCRYPTO_ALLOW_PAYMENTS === "YES";
const preferredNetwork = String(process.env.BENTCRYPTO_PREFERRED_PAYMENT_NETWORK || "").trim() || null;

async function paymentClient() {
  const schemes = [];
  const available = new Set();

  const evmKey = String(process.env.EVM_PRIVATE_KEY || "").trim();
  if (evmKey) {
    const account = privateKeyToAccount(evmKey);
    schemes.push({ network: BASE_MAINNET, client: new ExactEvmScheme(account) });
    available.add(BASE_MAINNET);
  }

  const svmKey = String(process.env.SVM_PRIVATE_KEY || "").trim();
  if (svmKey) {
    const signer = await createKeyPairSignerFromBytes(base58.decode(svmKey));
    schemes.push({ network: SOLANA_MAINNET, client: new ExactSvmScheme(signer) });
    available.add(SOLANA_MAINNET);
  }

  if (!schemes.length) {
    throw new Error("No payment wallet configured. Set EVM_PRIVATE_KEY and/or SVM_PRIVATE_KEY in the MCP host environment.");
  }

  const wrapped = wrapFetchWithPaymentFromConfig(fetch, {
    schemes,
    paymentRequirementsSelector: (_version, accepts) => chooseRequirement(accepts, available, maxBaseUnits, preferredNetwork),
  });
  return { fetch: wrapped, available };
}

async function freeGet(path) {
  const response = await fetch(`${origin}${path}`, {
    headers: { Accept: "application/json", "User-Agent": `BentCrypto-MCP/${VERSION}` },
    redirect: "error",
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text.slice(0, 4000); }
  return { status: response.status, body };
}

async function preview(path) {
  const response = await fetch(`${origin}${path}`, {
    headers: { Accept: "application/json", "User-Agent": `BentCrypto-MCP/${VERSION}` },
    redirect: "error",
  });
  const challenge = sanitizeChallenge(decodePaymentHeader(response.headers.get("payment-required")));
  return { status: response.status, challenge };
}

async function paidCall(path) {
  if (!paymentsEnabled) {
    throw new Error("Payments are disabled. Set BENTCRYPTO_ALLOW_PAYMENTS=YES after funding a dedicated wallet and reviewing the $0.01-per-call spend policy.");
  }
  const client = await paymentClient();
  const response = await client.fetch(`${origin}${path}`, {
    headers: { Accept: "application/json", "User-Agent": `BentCrypto-MCP/${VERSION}` },
    redirect: "error",
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 4000) }; }
  if (!response.ok) throw new Error(`BentCrypto HTTP ${response.status}: ${JSON.stringify(body).slice(0, 1000)}`);
  return {
    request_id: response.headers.get("x-request-id"),
    settlement: decodePaymentHeader(response.headers.get("payment-response")),
    result: body,
  };
}

function result(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

function toolError(error) {
  return {
    isError: true,
    content: [{ type: "text", text: error?.message || "BentCrypto MCP tool failed" }],
  };
}

const server = new McpServer({ name: "BentCrypto x402", version: VERSION });

server.registerTool(
  "discover_bentcrypto",
  {
    title: "Discover BentCrypto API",
    description: "Free discovery of BentCrypto x402 Token Risk and Token Security capabilities, pricing and supported chains. Does not create a payment.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async () => {
    try {
      const [root, pricing, openapi] = await Promise.all([freeGet("/"), freeGet("/pricing"), freeGet("/openapi.json")]);
      return result({ origin, canonical_origin: CANONICAL_API_ORIGIN, root: root.body, pricing: pricing.body, openapi: openapi.body });
    } catch (error) { return toolError(error); }
  },
);

server.registerTool(
  "preview_token_risk_payment",
  {
    title: "Preview Token Risk Payment",
    description: "Fetch the live HTTP 402 challenge for a Token Risk request without signing or paying. Useful for reviewing network, asset and amount before enabling paid calls.",
    inputSchema: z.object({
      chain: z.enum(["solana", "base"]),
      address: z.string().min(1),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ chain, address }) => {
    try {
      const token = validateTokenAddress(chain, address);
      return result(await preview(`/v1/token/risk?chain=${encodeURIComponent(chain)}&address=${encodeURIComponent(token)}`));
    } catch (error) { return toolError(error); }
  },
);

server.registerTool(
  "token_risk",
  {
    title: "BentCrypto Token Risk",
    description: "Paid $0.01 USDC x402 token-risk analysis. Use before a swap, trade, listing or automated portfolio action. Supports Solana and Base. The MCP bridge enforces a local spend cap and approved mainnet USDC assets.",
    inputSchema: z.object({
      chain: z.enum(["solana", "base"]),
      address: z.string().min(1),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ chain, address }) => {
    try {
      const token = validateTokenAddress(chain, address);
      return result(await paidCall(`/v1/token/risk?chain=${encodeURIComponent(chain)}&address=${encodeURIComponent(token)}`));
    } catch (error) { return toolError(error); }
  },
);

server.registerTool(
  "token_security",
  {
    title: "BentCrypto Token Security",
    description: "Paid $0.01 USDC x402 Solana Token Security analysis for mint/freeze authority and Token-2022 control evidence. Solana only; Base is intentionally unsupported.",
    inputSchema: z.object({ address: z.string().min(1) }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ address }) => {
    try {
      const token = validateTokenAddress("solana", address);
      return result(await paidCall(`/v1/token/security?chain=solana&address=${encodeURIComponent(token)}`));
    } catch (error) { return toolError(error); }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
