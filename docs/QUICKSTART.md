# BentCrypto Quickstart

This guide shows the shortest path from discovery to a guarded paid BentCrypto API response.

## 1. Choose an endpoint

Token Risk:

```text
GET https://api.bentcrypto.com/v1/token/risk?chain=<solana|base>&address=<TOKEN_ADDRESS>
```

Token Security:

```text
GET https://api.bentcrypto.com/v1/token/security?chain=solana&address=<SOLANA_MINT>
```

Each authorized request currently costs $0.01 USDC.

Token Risk supports two independent choices:

- **analysis chain** — `chain=solana` or `chain=base` selects the token network BentCrypto analyzes;
- **payment network** — the buyer can choose any compatible x402 payment option offered in the runtime 402 challenge. Current Token Risk production offers Solana mainnet and Base mainnet USDC.

The analysis chain and payment network do not have to match.

## 2. Invalid input is rejected before payment

BentCrypto validates the supported chain and token-address shape before returning a payment challenge. Missing, malformed, or unsupported input returns a free HTTP `400` and does not include `Payment-Required`.

Machine discovery remains available without touching a paid route:

```text
https://api.bentcrypto.com/.well-known/x402
https://api.bentcrypto.com/openapi.json
https://api.bentcrypto.com/agents.json
https://api.bentcrypto.com/llms.txt
https://api.bentcrypto.com/pricing
```

## 3. Inspect a valid payment challenge for free

Solana analysis:

```bash
curl -i "https://api.bentcrypto.com/v1/token/risk?chain=solana&address=So11111111111111111111111111111111111111112"
```

Base analysis:

```bash
curl -i "https://api.bentcrypto.com/v1/token/risk?chain=base&address=0x4200000000000000000000000000000000000006"
```

A valid request should receive HTTP `402` and a `Payment-Required` header containing the authoritative x402 v2 requirements. These requests do not make a payment.

## 4. JavaScript — Solana payment

```bash
npm install
```

PowerShell:

```powershell
$env:SVM_PRIVATE_KEY = "<64-byte-base58-solana-secret-key>"
$env:CONFIRM_X402_PAYMENT = "YES"
npm run token-risk
```

The Solana helper refuses to pay unless it sees the expected x402 v2 Solana mainnet, USDC, $0.01 amount, and BentCrypto receiver.

## 5. JavaScript — Base payment

Inspect only:

```bash
npm run token-risk:base:challenge
```

Paid request:

```powershell
$env:EVM_PRIVATE_KEY = "0x<64-hex-private-key>"
$env:CONFIRM_X402_PAYMENT = "YES"
npm run token-risk:base
```

The Base helper refuses to pay unless it sees exactly:

- x402 v2
- scheme `exact`
- Base mainnet `eip155:8453`
- native Base USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- amount `10000` base units = $0.01 USDC
- BentCrypto's expected Base receiver

It verifies the returned settlement after HTTP 200.

## 6. Python — install

Python 3.11+ recommended.

```bash
python -m venv .venv
# Windows: .\.venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

## 7. Python — Solana payment

```powershell
$env:SVM_PRIVATE_KEY = "<64-byte-base58-solana-secret-key>"
$env:CONFIRM_X402_PAYMENT = "YES"
python .\python\token_risk.py
```

## 8. Python — Base payment

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

The Base Python example uses the x402 v2 httpx EVM mechanism and performs the same unpaid preflight checks before signing.

## 9. Token Security

Token Security is Solana-only:

```bash
node ./javascript/token-security.js
```

or:

```powershell
python .\python\token_security.py
```

## 10. Clear local payment variables

PowerShell:

```powershell
Remove-Item Env:SVM_PRIVATE_KEY -ErrorAction SilentlyContinue
Remove-Item Env:EVM_PRIVATE_KEY -ErrorAction SilentlyContinue
Remove-Item Env:CONFIRM_X402_PAYMENT -ErrorAction SilentlyContinue
Remove-Item Env:BENTCRYPTO_CHALLENGE_ONLY -ErrorAction SilentlyContinue
```

macOS/Linux:

```bash
unset SVM_PRIVATE_KEY
unset EVM_PRIVATE_KEY
unset CONFIRM_X402_PAYMENT
unset BENTCRYPTO_CHALLENGE_ONLY
```

## Notes

- Use a dedicated payment wallet with limited funds.
- Never commit wallet secrets to a repository.
- Runtime `Payment-Required` is authoritative for amount, asset, receiver, timeout, and accepted payment requirements.
- Token Risk analysis chain and payment settlement network are independent.
- Token Security beta does not perform exit validation and reports `honeypot_status: UNKNOWN`.
