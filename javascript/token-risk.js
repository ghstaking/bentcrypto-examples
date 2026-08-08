import { paidGet } from "./_client.js";

const mint = process.argv[2] || "So11111111111111111111111111111111111111112";
const url = `https://api.bentcrypto.com/v1/token/risk?chain=solana&address=${encodeURIComponent(mint)}`;

const { body, requestId, settlement } = await paidGet(url);

console.log("PASS: paid Token Risk request returned HTTP 200");
console.log(JSON.stringify({
  request_id: requestId,
  address: body.address,
  risk_score: body?.risk?.score ?? null,
  risk_level: body?.risk?.level ?? null,
  coverage_percent: body?.confidence?.coverage_percent ?? null,
  settlement: settlement ? {
    success: settlement.success ?? null,
    transaction: settlement.transaction ?? settlement.txHash ?? null,
    network: settlement.network ?? null,
  } : null,
}, null, 2));
