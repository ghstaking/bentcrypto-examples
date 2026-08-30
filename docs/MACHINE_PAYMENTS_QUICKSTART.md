# BentCrypto Machine Payments Quickstart

Canonical API: `https://api.bentcrypto.com`

Current machine-payment surfaces:

- x402 v2: Token Risk on Solana/Base and Token Security on Solana.
- MCP: `POST https://api.bentcrypto.com/mcp` with `token_risk` and `token_security` tools. Paid tool calls use the existing x402 HTTP boundary.
- MPP canary: `GET https://api.bentcrypto.com/mpp/v1/token/risk` for Base Token Risk using USDC charge.

Current prices are $0.01 per Token Risk or Token Security call. The runtime HTTP 402 challenge is authoritative for payment requirements.

## Discovery

- `https://api.bentcrypto.com/openapi.json`
- `https://api.bentcrypto.com/.well-known/x402`
- `https://api.bentcrypto.com/agents.json`
- `https://api.bentcrypto.com/llms.txt`
- `https://api.bentcrypto.com/skill.md`
- `https://api.bentcrypto.com/pricing`

## x402 flow

1. Request the target endpoint.
2. Receive HTTP 402 with `Payment-Required`.
3. Validate network, asset, amount, receiver, and local spend policy.
4. Use an x402-compatible client to retry the same request.
5. Consume the 200 result and settlement evidence.

## MCP

Run `examples/mcp-tools-list.mjs` to verify the public MCP server and list tools without paying. A `tools/call` for a paid tool returns an x402 challenge until an x402-capable transport supplies valid payment authorization.

## MPP

Run `examples/mpp-base-challenge.mjs` to inspect the Base MPP challenge without paying. It validates `WWW-Authenticate: Payment`, `method="evm"`, and `intent="charge"`, then stops before payment submission.

## Product boundaries

- `token_risk`: Solana and Base via x402/MCP.
- `token_security`: Solana only via x402/MCP.
- MPP canary: Base Token Risk only.
- Unsupported Token Security chains are rejected before payment.
