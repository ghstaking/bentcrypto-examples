# Hermes Agent integration

BentCrypto runs as a local stdio MCP server. Hermes can keep separate named profiles, and each profile has its own MCP configuration. For that reason, the recommended setup path is now **Hermes CLI registration** (`hermes mcp add`) instead of manually editing `~/.hermes/config.yaml`.

Hermes prefixes discovered MCP tools with `mcp_<server_name>_...`.

## Windows helper — recommended

The repository includes a safe Windows setup helper that clones/updates the public BentCrypto examples, installs dependencies, and runs the MCP regression tests.

By default it does **not** modify Hermes configuration, store wallet keys, enable payments, or make a paid call.

From PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
irm https://raw.githubusercontent.com/ghstaking/bentcrypto-examples/main/mcp/install-hermes-windows.ps1 -OutFile "$env:TEMP\install-bentcrypto-mcp.ps1"
& "$env:TEMP\install-bentcrypto-mcp.ps1"
```

At the end, the helper prints the profile-safe `hermes mcp add`, `hermes mcp test`, and `hermes mcp configure` commands for the active Hermes profile.

To explicitly let the helper register BentCrypto with the active Hermes profile after validation:

```powershell
& "$env:TEMP\install-bentcrypto-mcp.ps1" -RegisterWithHermes
```

To target a specific named profile:

```powershell
& "$env:TEMP\install-bentcrypto-mcp.ps1" -RegisterWithHermes -HermesProfile solomon
```

The helper still writes `hermes-bentcrypto-snippet.yaml` as a manual fallback, but direct config editing is not the recommended path when Hermes profiles are in use.

## Manual profile-safe setup

Clone/install the server:

```powershell
git clone https://github.com/ghstaking/bentcrypto-examples.git
cd .\bentcrypto-examples\mcp
npm install
```

Register it through Hermes so the active profile receives the entry:

```powershell
hermes mcp add bentcrypto --command node --args "C:\ABSOLUTE\PATH\bentcrypto-examples\mcp\server.mjs"
```

For a named profile:

```powershell
hermes -p solomon mcp add bentcrypto --command node --args "C:\ABSOLUTE\PATH\bentcrypto-examples\mcp\server.mjs"
```

`--args` must remain last because everything after it belongs to the MCP child process.

Then verify the actual stdio connection:

```powershell
hermes mcp list
hermes mcp test bentcrypto
```

Or for a named profile:

```powershell
hermes -p solomon mcp list
hermes -p solomon mcp test bentcrypto
```

## Safe first test — discovery only

Use Hermes' tool selector:

```powershell
hermes mcp configure bentcrypto
```

Enable only:

- `discover_bentcrypto`
- `preview_token_risk_payment`

For a named profile:

```powershell
hermes -p solomon mcp configure bentcrypto
```

Then start Hermes:

```powershell
hermes chat
```

Inside the Hermes chat, `/reload-mcp` is a Hermes slash command — it is **not** a PowerShell command.

Run:

```text
/reload-mcp
```

Then ask:

```text
Tell me which BentCrypto MCP tools are available. Then use the free discovery tool and summarize the supported products, chains, and pricing. Do not make a payment.
```

A second safe validation prompt is:

```text
Use BentCrypto to preview the x402 payment requirement for a token-risk request, but do not sign or pay anything.
```

## Manual YAML fallback

If you intentionally manage Hermes YAML yourself, first determine which profile is active. A named profile can use a config under `~/.hermes/profiles/<profile>/config.yaml` rather than the root `~/.hermes/config.yaml`.

A discovery-only entry is:

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

Prefer `hermes mcp add` because Hermes itself resolves the active/profile-scoped config location.

## Paid tools — explicit opt-in only

After the free discovery and payment-preview flow works, you can expose the paid tools and configure only a dedicated payment wallet you explicitly intend to use.

Payments are disabled by default in BentCrypto MCP. The paid server tools fail closed unless `BENTCRYPTO_ALLOW_PAYMENTS=YES` is set.

Example configuration shape:

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

Use only the wallet variable(s) required for the payment network you intend to use. Keep private keys in the Hermes process environment rather than committing them to config files whenever possible. BentCrypto's remote API does not receive payer private keys; signing happens in the local MCP process.

Token Risk supports Solana and Base. Token Security supports Solana only. Before signing, the bridge validates the live HTTP 402 requirement against supported mainnet USDC assets and the local per-call spend cap.

## npm / `npx` installation

The package is prepared for public npm distribution as `bentcrypto-mcp`. After the first npm publication is confirmed live, local-path registration can be replaced with:

```powershell
hermes mcp add bentcrypto --command npx --args -y bentcrypto-mcp
```

Then use `hermes mcp configure bentcrypto` to keep the initial tool surface discovery-only.

Do not use the `npx` form until the package is confirmed live on npm.
