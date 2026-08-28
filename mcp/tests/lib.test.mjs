import assert from "node:assert/strict";
import test from "node:test";
import {
  BASE_MAINNET, BASE_USDC, SOLANA_MAINNET, SOLANA_USDC,
  apiOrigin, chooseRequirement, decodePaymentHeader, maxPaymentBaseUnits,
  sanitizeChallenge, validateRequirement, validateTokenAddress,
} from "../lib.mjs";

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64");

test("canonical origin is locked by default", () => {
  assert.equal(apiOrigin({}), "https://api.bentcrypto.com");
  assert.throws(() => apiOrigin({ BENTCRYPTO_API_URL: "https://evil.example" }), /blocked/);
});

test("max payment defaults to one cent", () => {
  assert.equal(maxPaymentBaseUnits({}), 10000n);
  assert.throws(() => maxPaymentBaseUnits({ BENTCRYPTO_MAX_USDC_PER_CALL: "2" }), /no more than/);
});

test("challenge decoding is safe", () => {
  const decoded = decodePaymentHeader(b64({ x402Version: 2, accepts: [] }));
  assert.equal(decoded.x402Version, 2);
  assert.equal(decodePaymentHeader("not-base64-json"), null);
  assert.deepEqual(sanitizeChallenge({ x402Version: 2, resource: { url: "https://api.bentcrypto.com/x" }, accepts: [{ scheme: "exact", network: BASE_MAINNET, amount: "10000", asset: BASE_USDC, payTo: "not-needed" }] }), {
    x402Version: 2,
    resource: "https://api.bentcrypto.com/x",
    accepts: [{ scheme: "exact", network: BASE_MAINNET, amount: "10000", asset: BASE_USDC, maxTimeoutSeconds: null }],
  });
});

test("spend policy accepts only configured mainnet USDC requirements", () => {
  const networks = new Set([BASE_MAINNET, SOLANA_MAINNET]);
  assert.equal(validateRequirement({ scheme: "exact", network: BASE_MAINNET, amount: "10000", asset: BASE_USDC }, networks, 10000n).ok, true);
  assert.equal(validateRequirement({ scheme: "exact", network: SOLANA_MAINNET, amount: "10000", asset: SOLANA_USDC }, networks, 10000n).ok, true);
  assert.equal(validateRequirement({ scheme: "exact", network: BASE_MAINNET, amount: "10001", asset: BASE_USDC }, networks, 10000n).ok, false);
  assert.equal(validateRequirement({ scheme: "exact", network: BASE_MAINNET, amount: "10000", asset: "0x0000000000000000000000000000000000000000" }, networks, 10000n).ok, false);
});

test("selector prefers requested network", () => {
  const accepts = [
    { scheme: "exact", network: SOLANA_MAINNET, amount: "10000", asset: SOLANA_USDC },
    { scheme: "exact", network: BASE_MAINNET, amount: "10000", asset: BASE_USDC },
  ];
  const selected = chooseRequirement(accepts, new Set([SOLANA_MAINNET, BASE_MAINNET]), 10000n, BASE_MAINNET);
  assert.equal(selected.network, BASE_MAINNET);
});

test("address validation is chain-specific", () => {
  assert.equal(validateTokenAddress("base", "0x4200000000000000000000000000000000000006"), "0x4200000000000000000000000000000000000006");
  assert.equal(validateTokenAddress("solana", "So11111111111111111111111111111111111111112"), "So11111111111111111111111111111111111111112");
  assert.throws(() => validateTokenAddress("base", "So11111111111111111111111111111111111111112"));
});
