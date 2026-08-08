import { paidGet, verifyChallenge } from "./_client.js";

const challengeOnly = process.argv.includes("--challenge-only");
const endpoint = process.env.BENTCRYPTO_ENDPOINT || "token-risk";
const mintArg = process.argv.find((arg) => !arg.startsWith("--") && arg !== process.argv[0] && arg !== process.argv[1]);
const mint = mintArg || "So11111111111111111111111111111111111111112";
const path = endpoint === "token-security" ? "/v1/token/security" : "/v1/token/risk";
const url = `https://api.bentcrypto.com${path}?chain=solana&address=${encodeURIComponent(mint)}`;

if (challengeOnly) {
  await verifyChallenge(url);
  console.log("No payment made: challenge-only mode.");
} else {
  const result = await paidGet(url);
  console.log(JSON.stringify({
    request_id: result.requestId,
    endpoint: path,
    address: result.body?.address ?? mint,
    settlement_success: result.settlement?.success ?? null,
  }, null, 2));
}
