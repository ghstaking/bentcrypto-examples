# Hermes Agent integration

BentCrypto runs as a local stdio MCP server. Hermes Agent reads MCP servers from `~/.hermes/config.yaml` under `mcp_servers` and automatically registers discovered tools with an `mcp_<server>_...` prefix.

## Windows helper — recommended

The repository includes a safe setup helper that clones/updates the public BentCrypto examples, installs the MCP dependencies, runs the MCP tests, and writes a **discovery-only** Hermes YAML snippet. It deliberately does not edit your Hermes config, store wallet keys, enable payments, or make a paid call.

From PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
irm https://raw.githubusercontent.com/ghstaking/bentcrypto-examples/main/mcp/install-hermes-windows.ps1 -OutFile "$env:TEMP\install-bentcrypto-mcp.ps1"
& "$env:TEMP\install-bentcrypto-mcp.ps1"
```

Review the generated `hermes-bentcrypto-snippet.yaml`, merge it into `~/.hermes/config.yaml`, then restart Hermes or run `/reload-mcp`.

## Safe first test — discovery only

Keep payments disabled for the first connection. If you prefer manual setup, clone `ghstaking/bentcrypto-examples`, install the MCP package dependencies, and point Hermes at the local server file.

PowerShell example:

```powershell
git clone https://github.com/ghstaking/bentcrypto-examples.git
cd .\bentcrypto-examples\mcp
npm install
```

Then add this to `~/.hermes/config.yaml` (on Windows this is normally under your user profile, for example `C:\Users\<you>\.hermes\config.yaml`):

```yaml
mcp_servers:
  bentcrypto:
    command: "node"
    args:
      - "C:/ABSOLUTE/PATH/bentcrypto-examples/mcp/server.mjs"
    enabled: true
    timeout: 120
    tools:
      include:
        - discover_bentcrypto
        - preview_token_risk_payment
```

Restart Hermes or run `/reload-mcp`, then ask:

```text
Tell me which BentCrypto MCP tools are available. Then use the free discovery tool and summarize the supported products, chains, and pricing. Do not make a payment.
```

A second safe validation prompt is:

```text
Use BentCrypto to preview the x402 payment requirement for a token-risk request, but do not sign or pay anything.
```

## Paid tools — explicit opt-in only

After the free discovery/preview flow works, you can expose the paid tools and configure only the dedicated payment wallet(s) you actually intend to use.

```yaml
mcp_servers:
  bentcrypto:
    command: "node"
    args:
      - "C:/ABSOLUTE/PATH/bentcrypto-examples/mcp/server.mjs"
    enabled: true
    timeout: 120
    env:
      BENTCRYPTO_ALLOW_PAYMENTS: "YES"
      BENTCRYPTO_MAX_USDC_PER_CALL: "0.01"
      EVM_PRIVATE_KEY: "${EVM_PRIVATE_KEY}"
      SVM_PRIVATE_KEY: "${SVM_PRIVATE_KEY}"
    tools:
      include:
        - discover_bentcrypto
        - preview_token_risk_payment
        - token_risk
        - token_security
```

Use only the wallet variable(s) you need. Keep private keys in the Hermes process environment rather than committing them to `config.yaml` whenever possible. BentCrypto never needs a seed phrase or private key; signing is performed by the local MCP process.

Token Risk supports Solana and Base. Token Security supports Solana only. The bridge validates the live HTTP 402 requirement against supported mainnet USDC assets and the local per-call spend cap before signing.

## npm / `npx` installation

The package is prepared for public npm distribution as `bentcrypto-mcp`. After the first npm publication is completed, the local-path configuration can be replaced with:

```yaml
mcp_servers:
  bentcrypto:
    command: "npx"
    args: ["-y", "bentcrypto-mcp"]
    enabled: true
    timeout: 120
    tools:
      include:
        - discover_bentcrypto
        - preview_token_risk_payment
```

Do not use the `npx` form until the package is confirmed live on npm.
