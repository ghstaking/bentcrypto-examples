# BentCrypto machine-payment examples

- `mcp-tools-list.mjs` — verifies the production MCP server and lists tools without paying.
- `mpp-base-challenge.mjs` — verifies the production Base MPP Payment challenge and stops before payment submission.
- `mpp-base-paid.mjs` — guarded Base MPP Token Risk buyer. Requires local `EVM_PRIVATE_KEY` and `CONFIRM_MPP_PAYMENT=YES`; hard-limited to Base USDC, $0.01 maximum, one retry, and the canonical `api.bentcrypto.com` origin/path.

For x402 paid-client examples, see the existing `javascript/` and `python/` directories. For MCP client packaging and Hermes integration, see `mcp/`.

All wallet signing stays local to the buyer. Never commit wallet material.

Canonical API: `https://api.bentcrypto.com`