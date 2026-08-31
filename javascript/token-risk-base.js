import { x402Client, x402HTTPClient } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const EXPECTED_NETWORK = "eip155:8453";
const EXPECTED_AMOUNT = "10000";
const EXPECTED_ASSET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".toLowerCase();
const EXPECTED_PAY_TO = "0x2E0f8B55F4a224a6017626BE5D862cb8eCb74f3b".toLowerCase();
const DEFAULT_TOKEN = "0x4200000000000000000000000000000000000006";
const token = process.env.BASE_TOKEN_ADDRESS || DEFAULT_TOKEN;
const apiUrl = `https://api.bentcrypto.com/v1/token/risk?chain=base&address=${encodeURIComponent(token)}`;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function decodeHeader(value, name) {
  if (!value) fail(`${name} header is missing`);
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8"));
  } catch {
    fail(`${name} header is not valid base64 JSON`);
  }
}

function selectAndValidateBaseRequirement(challenge) {
  if (challenge?.x402Version !== 2) fail(`unexpected x402 version: ${challenge?.x402Version}`);
  const accepts = Array.isArray(challenge?.accepts) ? challenge.accepts : [];
  const exact = accepts.find(item => item?.scheme === "exact" && item?.network === EXPECTED_NETWORK);
  if (!exact) fail(`no exact ${EXPECTED_NETWORK} payment option in challenge`);
  if (String(exact.amount) !== EXPECTED_AMOUNT) fail(`unexpected amount: ${exact.amount}`);
  if (String(exact.asset || "").toLowerCase() !== EXPECTED_ASSET) fail(`unexpected Base USDC asset: ${exact.asset}`);
  if (String(exact.payTo || "").toLowerCase() !== EXPECTED_PAY_TO) fail(`unexpected receiver: ${exact.payTo}`);
  return exact;
}

async function preflight() {
  const response = await fetch(apiUrl, { method: "GET", redirect: "error" });
  if (response.status !== 402) fail(`expected HTTP 402, received ${response.status}`);
  const challenge = decodeHeader(response.headers.get("payment-required"), "payment-required");
  const exact = selectAndValidateBaseRequirement(challenge);
  console.log("PASS: BentCrypto Base x402 challenge verified");
  console.log(JSON.stringify({
    analysis_chain: "base",
    payment_network: exact.network,
    amount_usdc_base_units: exact.amount,
    amount_usd: "0.01",
    asset: exact.asset,
    pay_to: exact.payTo,
    resource: challenge?.resource?.url || apiUrl,
  }, null, 2));
  return challenge;
}

await preflight();

if (process.argv.includes("--challenge-only")) {
  console.log("Challenge-only mode: no payment was authorized or submitted.");
  process.exit(0);
}

if (process.env.CONFIRM_X402_PAYMENT !== "YES") {
  fail("payment not authorized; set CONFIRM_X402_PAYMENT=YES only when ready to spend exactly $0.01 USDC");
}

const privateKey = process.env.EVM_PRIVATE_KEY;
if (!privateKey) fail("EVM_PRIVATE_KEY is missing; keep it only in your local shell");
if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) fail("EVM_PRIVATE_KEY must be 0x followed by 64 hexadecimal characters");

const signer = privateKeyToAccount(privateKey);
const client = new x402Client();
client.register("eip155:*", new ExactEvmScheme(signer));
const paidFetch = wrapFetchWithPayment(fetch, client);

const response = await paidFetch(apiUrl, { method: "GET", redirect: "error" });
const bodyText = await response.text();
if (!response.ok) {
  console.error(`Paid request failed with HTTP ${response.status}`);
  console.error(bodyText.slice(0, 2000));
  process.exit(1);
}

let body;
try {
  body = JSON.parse(bodyText);
} catch {
  fail("paid response was not valid JSON");
}

const httpClient = new x402HTTPClient(client);
const settlement = httpClient.getPaymentSettleResponse(name => response.headers.get(name));
if (!settlement || settlement.success !== true) fail("settlement did not report success=true");
if (String(settlement.network) !== EXPECTED_NETWORK) fail(`unexpected settlement network: ${settlement.network}`);
if (String(settlement.payer || "").toLowerCase() !== signer.address.toLowerCase()) fail(`unexpected settlement payer: ${settlement.payer}`);
if (!/^0x[0-9a-fA-F]{64}$/.test(String(settlement.transaction || ""))) fail("settlement transaction hash is missing or invalid");

console.log("PASS: paid Base x402 request returned HTTP 200");
console.log(JSON.stringify({
  request_id: response.headers.get("x-request-id"),
  payer: signer.address,
  settlement,
  result: {
    chain: body?.chain ?? null,
    address: body?.address ?? null,
    risk_score: body?.risk?.score ?? null,
    risk_level: body?.risk?.level ?? null,
    coverage_percent: body?.confidence?.coverage_percent ?? null,
  },
}, null, 2));
