# BentCrypto Examples

**Solana pre-trade intelligence for AI agents — $0.01 USDC per request via x402.**

BentCrypto exposes machine-readable token intelligence over HTTP with no API keys, accounts, or subscriptions. A client requests a resource, receives an HTTP `402 Payment Required` challenge, authorizes the x402 payment locally, and retries the request with payment proof.

## Live APIs

| API | Endpoint | Price | Status |
| --- | --- | ---: | --- |
| Token Risk | `GET https://api.bentcrypto.com/v1/token/risk` | $0.01 USDC | Limited beta |
| Token Security | `GET https://api.bentcrypto.com/v1/token/security` | $0.01 USDC | Limited beta |

Both currently support Solana mainnet. `chain=solana` is optional; `address=<SOLANA_MINT>` is required.

## Quick start: inspect the x402 challenge without paying

```bash
curl -i "https://api.bentcrypto.com/v1/token/risk?chain=solana&address=So11111111111111111111111111111111111111112"
```

Expected result: HTTP `402` with the x402 v2 payment requirement in the `payment-required` response header. No payment is made by this command.

## JavaScript: make a paid request

Requirements: Node.js 20+ and a dedicated Solana wallet funded with mainnet USDC.

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

The examples refuse to pay unless the challenge matches BentCrypto's expected Solana mainnet network, USDC mint, $0.01 amount, and receiver.

## Python: make a paid request

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

The current public Token Security beta evaluates on-chain token-control evidence. Exit validation is not enabled, so `metadata.exit_validation_performed` is `false` and `security.honeypot_status` remains `UNKNOWN`. It does **not** certify that a token is safe to trade.

## Documentation

- BentCrypto Agent API: https://bentcrypto.com/agent-api
- API docs: https://bentcrypto.com/docs
- Token Risk: https://bentcrypto.com/apis/token-risk
- Token Security: https://bentcrypto.com/apis/token-security
- OpenAPI: https://bentcrypto.com/openapi.json
- Machine-readable manifest: https://bentcrypto.com/agent-api.json
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
