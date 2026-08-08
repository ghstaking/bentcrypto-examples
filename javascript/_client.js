import { base58 } from "@scure/base";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";

export const EXPECTED_NETWORK = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export const EXPECTED_AMOUNT = "10000";
export const EXPECTED_ASSET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const EXPECTED_PAY_TO = "5bZdrGYAbHdbVCqw7RVUpxma22kJehaQCHhp4nHuHCyy";

export function fail(message) {
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

export async function verifyChallenge(apiUrl) {
  const response = await fetch(apiUrl, { method: "GET", redirect: "error" });
  if (response.status !== 402) fail(`expected HTTP 402, received ${response.status}`);

  const challenge = decodeHeader(response.headers.get("payment-required"), "payment-required");
  if (challenge?.x402Version !== 2) fail("x402Version is not 2");

  const accepts = Array.isArray(challenge?.accepts) ? challenge.accepts : [];
  const exact = accepts.find((item) => item?.scheme === "exact" && item?.network === EXPECTED_NETWORK);
  if (!exact) fail("expected exact Solana mainnet payment requirement not found");
  if (String(exact.amount) !== EXPECTED_AMOUNT) fail(`amount mismatch: expected ${EXPECTED_AMOUNT}, got ${exact.amount}`);
  if (exact.asset !== EXPECTED_ASSET) fail(`asset mismatch: expected ${EXPECTED_ASSET}, got ${exact.asset}`);
  if (exact.payTo !== EXPECTED_PAY_TO) fail(`receiver mismatch: expected ${EXPECTED_PAY_TO}, got ${exact.payTo}`);

  console.log("PASS: BentCrypto x402 challenge verified");
  console.log(JSON.stringify({
    network: exact.network,
    amount_usdc_base_units: exact.amount,
    amount_usd: "0.01",
    asset: exact.asset,
    pay_to: exact.payTo,
    resource: challenge?.resource?.url || apiUrl,
  }, null, 2));

  return challenge;
}

export async function paidGet(apiUrl) {
  await verifyChallenge(apiUrl);

  if (process.env.CONFIRM_X402_PAYMENT !== "YES") {
    fail("payment not authorized; set CONFIRM_X402_PAYMENT=YES only when ready to spend exactly $0.01 USDC");
  }

  const secret = process.env.SVM_PRIVATE_KEY;
  if (!secret) fail("SVM_PRIVATE_KEY is missing; keep it only in your local shell");

  let signer;
  try {
    signer = await createKeyPairSignerFromBytes(base58.decode(secret));
  } catch (error) {
    fail(`could not create Solana signer: ${error?.message || "invalid private key"}`);
  }

  const client = new x402Client();
  client.register("solana:*", new ExactSvmScheme(signer));
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  const response = await fetchWithPayment(apiUrl, { method: "GET", redirect: "error" });
  const bodyText = await response.text();
  if (response.status !== 200) {
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

  const paymentResponse = response.headers.get("payment-response");
  const settlement = paymentResponse ? decodeHeader(paymentResponse, "payment-response") : null;

  return {
    body,
    requestId: response.headers.get("x-request-id"),
    settlement,
  };
}
