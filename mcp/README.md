# BentCrypto MCP Bridge

A local stdio MCP bridge for the live BentCrypto x402 APIs. It exposes free discovery plus paid Token Risk and Token Security tools to MCP-capable clients while keeping payment signing material on the user's machine.

<!-- mcp-name: io.github.ghstaking/bentcrypto-mcp -->

## Tools

- `discover_bentcrypto` — free API/pricing/OpenAPI discovery; never pays.
- `preview_token_risk_payment` — fetches and sanitizes the live 402 challenge; never signs or pays.
- `token_risk` — $0.01 USDC per authorized request; Solana + Base analysis.
- `token_security` — $0.01 USDC per authorized request; Solana only.

## Safety defaults

Payments are **off by default**. Paid tools require `BENTCRYPTO_ALLOW_PAYMENTS=YES`. The bridge defaults to a maximum of **$0.01 USDC per call**, accepts only the BentCrypto-supported Solana mainnet and Base mainnet payment networks, and validates the expected USDC asset before the wallet signs. The canonical API origin is locked to `https://api.bentcrypto.com` unless an explicit development override is enabled.

Private keys and seed phrases are never sent to BentCrypto. Wallet signing happens inside this local MCP process.

## Install from source

```bash
git clone https://github.com/ghstaking/bentcrypto-examples.git
cd bentcrypto-examples/mcp
npm install
npm start
```

For MCP hosts, configure this folder's `server.mjs` as a stdio server. Example:

```json
{
  "mcpServers": {
    "bentcrypto": {
      "command": "node",
      "args": ["/absolute/path/to/bentcrypto-examples/mcp/server.mjs"],
      "env": {
        "BENTCRYPTO_ALLOW_PAYMENTS": "YES",
        "BENTCRYPTO_MAX_USDC_PER_CALL": "0.01",
        "EVM_PRIVATE_KEY": "<dedicated Base payment wallet key>",
        "SVM_PRIVATE_KEY": "<dedicated Solana payment wallet key>"
      }
    }
  }
}
```

Configure only the wallet(s) you intend the bridge to use. A dedicated low-balance payment wallet is recommended. Do not commit `.env` files or private keys.

## Hermes Agent

Hermes supports named profiles, each with its own MCP configuration. Prefer Hermes' CLI so it writes the server into the active/profile-scoped config instead of manually assuming `~/.hermes/config.yaml` is the active file.

Example after installing from source:

```powershell
hermes mcp add bentcrypto --command node --args "C:\absolute\path\to\bentcrypto-examples\mcp\server.mjs"
hermes mcp test bentcrypto
hermes mcp configure bentcrypto
```

For the initial connection, expose only `discover_bentcrypto` and `preview_token_risk_payment`.

See [`HERMES.md`](./HERMES.md) for the profile-safe Windows helper, named-profile commands, safe test prompts, `/reload-mcp` workflow, and paid-tool opt-in.

## npm / npx distribution

The package metadata is prepared for public npm publication as `bentcrypto-mcp`, including the official MCP Registry ownership name `io.github.ghstaking/bentcrypto-mcp`. Until the first npm publication is confirmed, use the source install above.

After publication, compatible MCP hosts can use:

```text
npx -y bentcrypto-mcp
```

The repository CI performs syntax tests, unit tests, production-dependency audit, npm package-content dry-run, official MCP Registry metadata validation, Windows stdio testing, and MCPB manifest validation before distribution changes are merged.

## Smithery / MCPB distribution

Smithery's current local-stdio publishing flow distributes a pre-built MCPB bundle rather than relying on the older repository `smithery.yaml` flow. This repository now includes a standards-based [`manifest.json`](./manifest.json) for the BentCrypto local MCP server.

Validate it with:

```bash
npm run mcpb:validate
```

The current `smithery.yaml` is retained only as legacy metadata while the MCPB publication path is completed. Do not treat it as the authoritative Smithery release artifact.

A production Smithery release will be marked complete only after a real `.mcpb` bundle is built, published through an authenticated BentCrypto/maintainer Smithery account, and the resulting registry page is verified.

## Other MCP registries

Glama and similar directories should be submitted only through their legitimate maintainer/ownership flows. A directory listing is not considered complete until the public listing can be independently verified.

## Payment network selection

If both wallets are configured, the runtime x402 challenge remains authoritative. You can optionally set `BENTCRYPTO_PREFERRED_PAYMENT_NETWORK` to `eip155:8453` or `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`. Any selected requirement must still pass the local asset and spend-policy checks.

## Development override

Normal usage should always use `https://api.bentcrypto.com`. For a controlled local test server only:

```text
BENTCRYPTO_API_URL=http://127.0.0.1:4021
BENTCRYPTO_ALLOW_CUSTOM_ORIGIN=YES
```

The bridge rejects arbitrary custom origins unless that explicit override is present.
