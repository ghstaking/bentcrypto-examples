# BentCrypto Quickstart

This guide shows the shortest path from discovery to a paid BentCrypto API response.

## 1. Choose an endpoint

Token Risk:

```text
GET https://api.bentcrypto.com/v1/token/risk?chain=solana&address=<SOLANA_MINT>
```

Token Security:

```text
GET https://api.bentcrypto.com/v1/token/security?chain=solana&address=<SOLANA_MINT>
```

Each authorized request costs $0.01 USDC via x402 on Solana mainnet.

## 2. Inspect the payment challenge for free

```bash
curl -i "https://api.bentcrypto.com/v1/token/risk?chain=solana&address=So11111111111111111111111111111111111111112"
```

You should receive HTTP 402 and a `payment-required` header describing the x402 v2 payment requirement. This step does not make a payment.

## 3. Run a guarded JavaScript paid request

```bash
npm install
```

Set the payer key only in the local process environment and explicitly enable payment:

```powershell
$env:SVM_PRIVATE_KEY = "<64-byte-base58-solana-secret-key>"
$env:CONFIRM_X402_PAYMENT = "YES"
node .\javascript\token-risk.js
```

The helper performs an unpaid preflight first and refuses to pay unless it sees exactly:

- x402 v2
- scheme `exact`
- Solana mainnet CAIP-2 network
- Solana mainnet USDC
- amount `10000` base units = $0.01 USDC
- BentCrypto's expected receiving wallet

## 4. Run a guarded Python paid request

```bash
python -m venv .venv
pip install -r requirements.txt
```

Then set the same local environment variables and run:

```powershell
python .\python\token_risk.py
```

Token Security:

```powershell
python .\python\token_security.py
```

## 5. Clear local payment variables when finished

PowerShell:

```powershell
Remove-Item Env:SVM_PRIVATE_KEY -ErrorAction SilentlyContinue
Remove-Item Env:CONFIRM_X402_PAYMENT -ErrorAction SilentlyContinue
```

macOS/Linux:

```bash
unset SVM_PRIVATE_KEY
unset CONFIRM_X402_PAYMENT
```

## Notes

- Use a dedicated payment wallet with limited funds.
- Never commit wallet secrets to a repository.
- A valid payment is checked before route validation, so malformed paid requests can still return 400/404/5xx.
- Token Security beta does not perform exit validation and reports `honeypot_status: UNKNOWN`.
