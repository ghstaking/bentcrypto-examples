# BentCrypto Examples

**x402 token intelligence for AI agents — Token Risk on Solana + Base and Token Security on Solana. $0.01 USDC per authorized request.**

BentCrypto exposes machine-readable token intelligence over HTTP with no account, subscription, or traditional API key required for the paid call itself. A client requests a valid resource, receives an HTTP `402 Payment Required` challenge, authorizes the x402 payment locally, and retries the same request with payment proof.

## Live APIs

| API | Endpoint | Analysis chains | x402 payment networks | Price | Status |
| --- | --- | --- | --- | ---: | --- |
| Token Risk | `GET https://api.bentcrypto.com/v1/token/risk` | Solana + Base | Solana mainnet + Base mainnet | $0.01 USDC | Limited beta |
| Token Security | `GET https://api.bentcrypto.com/v1/token/security` | Solana only | Solana mainnet | $0.01 USDC | Limited beta |

### Analysis chain and payment network are independent

`chain=solana` or `chain=base` selects the blockchain BentCrypto analyzes. It does **not** force the payment to use the same network. For Token Risk, the runtime x402 challenge can offer both Solana and Base USDC payment options. A buyer should select any compatible requirement it supports and that fits its local spend policy.

Example: an agent can request `chain=base` analysis and pay the $0.01 fee using either the offered Base USDC option or the offered Solana USDC option.

The runtime `Payment-Required` challenge is always authoritative for the exact network, asset, amount, receiver, and timeout.

## Quick start: inspect a challenge without paying

Solana analysis:

```bash
curl -i "https://api.bentcrypto.com/v1/token/risk?chain=solana&address=So11111111111111111111111111111111111111112"
```

Base analysis:

```bash
curl -i "https://api.bentcrypto.com/v1/token/risk?chain=base&address=0x4200000000000000000000000000000000000006"
```

Expected result: HTTP `402` with an x402 v2 `Payment-Required` response header. These commands do not make a payment.

Invalid or unsupported request input is rejected with a free HTTP `400` **before** a payment challenge is issued.

## JavaScript: paid Solana Token Risk

Requirements: Node.js 20+ and a dedicated Solana wallet funded with mainnet USDC.

```bash
npm install
```

PowerShell:

```powershell
$env:SVM_PRIVATE_KEY = "<64-byte-base58-solana-secret-key>"
$env:CONFIRM_X402_PAYMENT = "YES"
npm run token-risk
```

macOS/Linux:

```bash
export SVM_PRIVATE_KEY='<64-byte-base58-solana-secret-key>'
export CONFIRM_X402_PAYMENT=YES
npm run token-risk
```

The Solana helper first performs an unpaid preflight and refuses to pay unless the challenge matches BentCrypto's expected Solana mainnet network, USDC mint, $0.01 amount, and receiver.

## JavaScript: paid Base Token Risk

Requirements: Node.js 20+ and a dedicated EVM wallet holding Base mainnet USDC.

Inspect only, no payment:

```bash
npm run token-risk:base:challenge
```

Paid request:

```powershell
$env:EVM_PRIVATE_KEY = "0x<64-hex-private-key>"
$env:CONFIRM_X402_PAYMENT = "YES"
npm run token-risk:base
```

macOS/Linux:

```bash
export EVM_PRIVATE_KEY='0x<64-hex-private-key>'
export CONFIRM_X402_PAYMENT=YES
npm run token-risk:base
```

The Base helper validates all of these before signing:

- x402 v2
- scheme `exact`
- network `eip155:8453`
- native Base USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- amount `10000` base units = $0.01 USDC
- BentCrypto's expected Base receiving address

It then uses the current x402 v2 EVM client and verifies the settlement response after HTTP 200.

To analyze a different Base token, set `BASE_TOKEN_ADDRESS` before running the example.

## Python: paid Solana Token Risk

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

## Python: paid Base Token Risk

Challenge-only mode:

```powershell
$env:BENTCRYPTO_CHALLENGE_ONLY = "YES"
python .\python\token_risk_base.py
Remove-Item Env:BENTCRYPTO_CHALLENGE_ONLY -ErrorAction SilentlyContinue
```

Paid request:

```powershell
$env:EVM_PRIVATE_KEY = "0x<64-hex-private-key>"
$env:CONFIRM_X402_PAYMENT = "YES"
python .\python\token_risk_base.py
```

The Python Base example uses `x402HttpxClient`, `EthAccountSigner`, and `register_exact_evm_client`, performs the same guarded unpaid preflight, and verifies the returned payment settlement metadata.

## Token Security

Token Security is Solana-only:

```bash
node ./javascript/token-security.js
```

or:

```powershell
python .\python\token_security.py
```

The current beta evaluates on-chain token-control evidence. Exit validation is not enabled, so `metadata.exit_validation_performed` is `false` and `security.honeypot_status` remains `UNKNOWN`. It does not certify that a token is safe to trade.

## MCP

Production HTTP MCP facade:

```text
POST https://api.bentcrypto.com/mcp
```

It exposes paid `token_risk` for Solana/Base and paid `token_security` for Solana behind the same x402 payment boundary. Invalid MCP tool input is validated before the payment gate.

The [`mcp/`](./mcp) folder also contains an optional local stdio bridge for MCP-capable clients that want wallet signing and spend-policy enforcement in a local process. See [`mcp/README.md`](./mcp/README.md).

## MPP canary

BentCrypto also exposes a Base-USDC MPP Token Risk canary at:

```text
GET https://api.bentcrypto.com/mpp/v1/token/risk
```

MPP is an alternate canary/beta payment path, not a replacement for x402. The runtime `WWW-Authenticate: Payment` challenge is authoritative.

## Response and challenge examples

Sanitized examples are under [`examples/`](./examples):

- [`token-risk-response.json`](./examples/token-risk-response.json)
- [`token-security-response.json`](./examples/token-security-response.json)
- [`payment-required.json`](./examples/payment-required.json) — current dual-network Token Risk challenge shape

## Machine-readable discovery

- x402: https://api.bentcrypto.com/.well-known/x402
- OpenAPI: https://api.bentcrypto.com/openapi.json
- x402 catalog: https://api.bentcrypto.com/x402.json
- Agent manifest: https://api.bentcrypto.com/agents.json
- LLM summary: https://api.bentcrypto.com/llms.txt
- Agent skill: https://api.bentcrypto.com/skill.md
- Pricing: https://api.bentcrypto.com/pricing

The well-known document explicitly identifies x402 v2, current analysis chains, and current payment networks. Runtime 402 requirements remain authoritative.

## Documentation

- BentCrypto Agent API: https://bentcrypto.com/agent-api
- API docs: https://bentcrypto.com/docs
- Token Risk: https://bentcrypto.com/apis/token-risk
- Token Security: https://bentcrypto.com/apis/token-security
- Quickstart: [`docs/QUICKSTART.md`](./docs/QUICKSTART.md)
- x402 notes: [`docs/X402.md`](./docs/X402.md)
- Official x402 buyer quickstart: https://docs.x402.org/getting-started/quickstart-for-buyers

## Security

BentCrypto never needs your private key or seed phrase. x402 payment signing happens inside the buyer's own client. Use a dedicated low-balance payment wallet, apply a local per-call spend policy, and never commit wallet material to source control.

After testing, clear payment variables from the shell.

PowerShell:

```powershell
Remove-Item Env:SVM_PRIVATE_KEY -ErrorAction SilentlyContinue
Remove-Item Env:EVM_PRIVATE_KEY -ErrorAction SilentlyContinue
Remove-Item Env:CONFIRM_X402_PAYMENT -ErrorAction SilentlyContinue
Remove-Item Env:BENTCRYPTO_CHALLENGE_ONLY -ErrorAction SilentlyContinue
```

## Beta notice

The APIs are in limited beta and their intelligence is informational only, not financial, legal, tax, or investment advice.

## License

MIT. See [`LICENSE`](./LICENSE).
