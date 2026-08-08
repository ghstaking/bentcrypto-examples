import { paidGet } from "./_client.js";

const mint = process.argv[2] || "So11111111111111111111111111111111111111112";
const url = `https://api.bentcrypto.com/v1/token/security?chain=solana&address=${encodeURIComponent(mint)}`;

const { body, requestId, settlement } = await paidGet(url);

console.log("PASS: paid Token Security request returned HTTP 200");
console.log(JSON.stringify({
  request_id: requestId,
  address: body.address,
  security_score: body?.security?.score ?? null,
  security_level: body?.security?.level ?? null,
  coverage_percent: body?.confidence?.coverage_percent ?? null,
  honeypot_status: body?.security?.honeypot_status ?? null,
  exit_validation_performed: body?.metadata?.exit_validation_performed ?? null,
  settlement: settlement ? {
    success: settlement.success ?? null,
    transaction: settlement.transaction ?? settlement.txHash ?? null,
    network: settlement.network ?? null,
  } : null,
}, null, 2));
