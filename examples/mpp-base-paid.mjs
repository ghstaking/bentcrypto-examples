import { Mppx } from "mppx/client";
import { charge } from "mppx/evm/client";
import { assets } from "mppx/evm";
import { privateKeyToAccount } from "viem/accounts";

const DEFAULT_ENDPOINT = "https://api.bentcrypto.com/mpp/v1/token/risk?chain=base&address=0x4200000000000000000000000000000000000006";
const endpoint = process.env.BENTCRYPTO_MPP_URL || DEFAULT_ENDPOINT;
const privateKey = process.env.EVM_PRIVATE_KEY;
const MAX_AMOUNT_USD = "0.01";

if (process.env.CONFIRM_MPP_PAYMENT !== "YES") {
  throw new Error("Payment is disabled by default. Set CONFIRM_MPP_PAYMENT=YES only when you intend to authorize one BentCrypto MPP request up to $0.01.");
}
if (!privateKey) {
  throw new Error("EVM_PRIVATE_KEY is required. Keep it local; never paste it into BentCrypto, chat, logs, or source control.");
}

const target = new URL(endpoint);
if (target.origin !== "https://api.bentcrypto.com") {
  throw new Error(`Refusing non-BentCrypto origin: ${target.origin}`);
}
if (target.pathname !== "/mpp/v1/token/risk") {
  throw new Error(`Refusing unexpected MPP path: ${target.pathname}`);
}
if (String(target.searchParams.get("chain") || "").toLowerCase() !== "base") {
  throw new Error("This example is Base-only; use chain=base.");
}
const tokenAddress = String(target.searchParams.get("address") || "");
if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
  throw new Error("A valid Base token contract address is required.");
}

const account = privateKeyToAccount(privateKey);

function parsePaymentChallenge(header) {
  const value = String(header || "");
  if (!/^Payment\s/i.test(value)) throw new Error("Missing MPP Payment challenge");
  return Object.fromEntries(
    [...value.matchAll(/([A-Za-z][A-Za-z0-9_-]*)="([^"]*)"/g)].map((match) => [match[1].toLowerCase(), match[2]])
  );
}

console.log(`Buyer: ${account.address}`);
console.log(`Endpoint: ${target.toString()}`);
console.log(`Hard spend ceiling: $${MAX_AMOUNT_USD}`);
console.log("Step 1: fetch and validate the unsigned MPP challenge...");

const challengeResponse = await fetch(target, {
  method: "GET",
  redirect: "error",
  headers: {
    Accept: "application/json",
    "User-Agent": "BentCrypto-Public-MPP-Example/1.0",
  },
});

if (challengeResponse.status !== 402) {
  throw new Error(`Expected HTTP 402 before payment, got ${challengeResponse.status}`);
}

const challenge = parsePaymentChallenge(challengeResponse.headers.get("www-authenticate"));
if (String(challenge.method || "").toLowerCase() !== "evm") {
  throw new Error(`Unexpected MPP method: ${challenge.method || "missing"}`);
}
if (String(challenge.intent || "").toLowerCase() !== "charge") {
  throw new Error(`Unexpected MPP intent: ${challenge.intent || "missing"}`);
}

console.log(`Challenge accepted: method=evm, intent=charge, request_id=${challengeResponse.headers.get("x-request-id") || "missing"}`);

const client = Mppx.create({
  methods: [
    charge({
      account,
      networks: [8453],
      currencies: [assets.base.USDC],
      maxAmount: MAX_AMOUNT_USD,
    }),
  ],
  polyfill: false,
  maxPaymentRetries: 1,
});

console.log("Step 2: sign locally and allow at most one paid retry...");
const response = await client.fetch(target, {
  method: "GET",
  redirect: "error",
  headers: {
    Accept: "application/json",
    "User-Agent": "BentCrypto-Public-MPP-Example/1.0",
  },
});

const text = await response.text();
let body = text;
try { body = JSON.parse(text); } catch {}

const receipt = response.headers.get("payment-receipt");
console.log(JSON.stringify({
  status: response.status,
  request_id: response.headers.get("x-request-id"),
  payment_receipt_present: Boolean(receipt),
  response: body,
}, null, 2));

if (!response.ok) throw new Error(`Paid MPP request returned HTTP ${response.status}`);
if (!receipt) throw new Error("Paid MPP response did not include Payment-Receipt");
if (body?.metadata?.payment_protocol !== "mpp") throw new Error("Response did not identify payment_protocol=mpp");
if (body?.metadata?.payment_intent !== "charge") throw new Error("Response did not identify payment_intent=charge");
if (body?.chain !== "base") throw new Error(`Unexpected analysis chain: ${body?.chain || "missing"}`);

console.log("PASS: Base MPP request completed under the hard $0.01 client spend ceiling.");