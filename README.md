# BentCrypto Examples

**x402 token intelligence for AI agents — Token Risk on Solana + Base and Token Security on Solana. $0.01 USDC per authorized request.**

BentCrypto exposes machine-readable token intelligence over HTTP with no account, subscription, or traditional API key required for the paid call itself. A client requests a resource, receives an HTTP `402 Payment Required` challenge, authorizes the x402 payment locally, and retries the request with payment proof.

## Live APIs

| API | Endpoint | Analysis chains | Price | Status |
| --- | --- | --- | ---: | --- |
| Token Risk | `GET https://api.bentcrypto.com/v1/token/risk` | Solana + Base | $0.01 USDC | Limited beta |
| Token Security | `GET https://api.bentcrypto.com/v1/token/security` | Solana only | $0.01 USDC | Limited beta |

For Token Risk, pass `chain=solana` with a Solana mint or `chain=base` with an EVM contract address. Token Security intentionally rejects Base.

## MCP bridge

The [`mcp/`](./mcp) folder contains a local stdio MCP bridge for MCP-capable agents and desktop clients. It exposes:

- free BentCrypto discovery;
- an unpaid Token Risk payment-preview tool;
- paid `token_risk` for Solana or Base;
- paid `token_security` for Solana.

Payments are disabled by default. When explicitly enabled, the bridge signs locally, validates approved mainnet USDC assets, and enforces a configurable per-call spend cap that defaults to $0.01. See [`mcp/README.md`](./mcp/README.md).

## Quick start: inspect the x402 challenge without paying

Solana:

```bash
curl -i "https://api.bentcrypto.com/v1/token/risk?chain=solana&address=So11111111111111111111111111111111111111112"
```

Base:

```bash
curl -i "https://api.bentcrypto.com/v1/token/risk?chain=base&address=0x4200000000000000000000000000000000000006"
```

Expected result: HTTP `402` with the authoritative x402 v2 payment requirement in the `payment-required` response header. No payment is made by either command.

## JavaScript: make a paid Solana request

The root JavaScript examples currently demonstrate the Solana payment path. Requirements: Node.js 20+ and a dedicated Solana wallet funded with mainnet USDC.

```bash
npm install
```

Set the payer private key **only in your local shell**. Never commit it to GitHub or paste it into logs/chat.

PowerShell:

```powershell
$env:SVM_PRIVATE_KEY = "<64-byte-base58-solana-secret-key>"
$env:CONFIRM_X402_PAYMENT = "YES"
node .\javascript\token-risk.js
```

macOS/Linux:

```bash
export SVM_PRIVATE_KEY='<64-byte-base58-solana-secret-key>'
export CONFIRM_X402_PAYMENT=YES
node ./javascript/token-risk.js
```

Token Security:

```bash
node ./javascript/token-security.js
```

The examples refuse to pay unless the challenge matches BentCrypto's expected Solana mainnet network, USDC mint, $0.01 amount, and receiver. For an MCP integration that can register both Base and Solana payment wallets, use [`mcp/`](./mcp).

## Python: make a paid Solana request

Python 3.11+ recommended.

```bash
python -m venv .venv
# Windows: .\.venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

PowerShell:

```powershell
$env:SVM_PRIVATE_KEY = "<64-byte-base58-solana-secret-key>"
$env:CONFIRM_X402_PAYMENT = "YES"
python .\python\token_risk.py
```

Token Security:

```powershell
python .\python\token_security.py
```

The Python examples use the official x402 Python SVM client and perform the same unpaid preflight checks before authorizing a real $0.01 request.

## Response examples

Sanitized beta examples are under [`examples/`](./examples):

- [`token-risk-response.json`](./examples/token-risk-response.json)
- [`token-security-response.json`](./examples/token-security-response.json)
- [`payment-required.json`](./examples/payment-required.json)

## Important Token Security limitation

The current public Token Security beta evaluates on-chain token-control evidence. Exit validation is not enabled, so `metadata.exit_validation_performed` is `false` and `security.honeypot_status` remains `UNKNOWN`. It does **not** certify that a token is safe to trade. Token Security is Solana-only.

## Machine-readable discovery

- x402: https://api.bentcrypto.com/.well-known/x402
- OpenAPI: https://api.bentcrypto.com/openapi.json
- Agent manifest: https://api.bentcrypto.com/agents.json
- LLM summary: https://api.bentcrypto.com/llms.txt
- Agent skill: https://api.bentcrypto.com/skill.md
- Pricing: https://api.bentcrypto.com/pricing

## Documentation

- BentCrypto Agent API: https://bentcrypto.com/agent-api
- API docs: https://bentcrypto.com/docs
- Token Risk: https://bentcrypto.com/apis/token-risk
- Token Security: https://bentcrypto.com/apis/token-security
- Quickstart: [`docs/QUICKSTART.md`](./docs/QUICKSTART.md)
- x402 notes: [`docs/X402.md`](./docs/X402.md)
- Official x402 buyer quickstart: https://docs.x402.org/getting-started/quickstart-for-buyers

## Security

BentCrypto never needs your private key or seed phrase. x402 payment signing happens inside the buyer's own client. Use a dedicated payment wallet with limited funds and never commit wallet material to source control.

This repository ignores `.env`, virtual environments, private-key file extensions, and common local build artifacts.

## Beta notice

The APIs are in limited beta and their intelligence is informational only, not financial, legal, tax, or investment advice.

## License

MIT. See [`LICENSE`](./LICENSE).
