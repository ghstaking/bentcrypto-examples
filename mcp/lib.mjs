export const CANONICAL_API_ORIGIN = "https://api.bentcrypto.com";
export const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export const BASE_MAINNET = "eip155:8453";
export const SOLANA_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export function apiOrigin(env = process.env) {
  const raw = String(env.BENTCRYPTO_API_URL || CANONICAL_API_ORIGIN).trim().replace(/\/$/, "");
  const parsed = new URL(raw);
  if (parsed.origin === CANONICAL_API_ORIGIN) return CANONICAL_API_ORIGIN;
  if (env.BENTCRYPTO_ALLOW_CUSTOM_ORIGIN !== "YES") {
    throw new Error("Custom API origin blocked. Set BENTCRYPTO_ALLOW_CUSTOM_ORIGIN=YES only for controlled development.");
  }
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname))) {
    throw new Error("Custom API origin must use HTTPS, except localhost/127.0.0.1 development.");
  }
  return parsed.origin;
}

export function maxPaymentBaseUnits(env = process.env) {
  const dollars = Number(env.BENTCRYPTO_MAX_USDC_PER_CALL || "0.01");
  if (!Number.isFinite(dollars) || dollars <= 0 || dollars > 1) {
    throw new Error("BENTCRYPTO_MAX_USDC_PER_CALL must be greater than 0 and no more than 1.00.");
  }
  return BigInt(Math.floor(dollars * 1_000_000 + 1e-9));
}

export function decodePaymentHeader(value) {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(String(value), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export function sanitizeChallenge(challenge) {
  if (!challenge || typeof challenge !== "object") return null;
  return {
    x402Version: challenge.x402Version ?? null,
    resource: challenge.resource?.url || null,
    accepts: Array.isArray(challenge.accepts)
      ? challenge.accepts.map((item) => ({
          scheme: item?.scheme || null,
          network: item?.network || null,
          amount: item?.amount == null ? null : String(item.amount),
          asset: item?.asset || null,
          maxTimeoutSeconds: item?.maxTimeoutSeconds ?? null,
        }))
      : [],
  };
}

export function validateRequirement(requirement, availableNetworks, maxBaseUnits) {
  if (!requirement || typeof requirement !== "object") return { ok: false, reason: "invalid_requirement" };
  if (requirement.scheme !== "exact") return { ok: false, reason: "unsupported_scheme" };
  if (!availableNetworks.has(requirement.network)) return { ok: false, reason: "wallet_not_configured_for_network" };

  const expectedAsset = requirement.network === BASE_MAINNET
    ? BASE_USDC.toLowerCase()
    : requirement.network === SOLANA_MAINNET
      ? SOLANA_USDC
      : null;
  if (!expectedAsset) return { ok: false, reason: "unsupported_network" };
  const actualAsset = String(requirement.asset || "");
  if (requirement.network === BASE_MAINNET) {
    if (actualAsset.toLowerCase() !== expectedAsset) return { ok: false, reason: "unexpected_asset" };
  } else if (actualAsset !== expectedAsset) {
    return { ok: false, reason: "unexpected_asset" };
  }

  let amount;
  try { amount = BigInt(requirement.amount); } catch { return { ok: false, reason: "invalid_amount" }; }
  if (amount <= 0n || amount > maxBaseUnits) return { ok: false, reason: "amount_exceeds_policy" };
  return { ok: true };
}

export function chooseRequirement(accepts, availableNetworks, maxBaseUnits, preferredNetwork = null) {
  const valid = (Array.isArray(accepts) ? accepts : []).filter((req) => validateRequirement(req, availableNetworks, maxBaseUnits).ok);
  if (!valid.length) throw new Error("No x402 payment requirement satisfies the configured wallet and spend policy.");
  if (preferredNetwork) {
    const preferred = valid.find((req) => req.network === preferredNetwork);
    if (preferred) return preferred;
  }
  return valid[0];
}

export function validateTokenAddress(chain, address) {
  const value = String(address || "").trim();
  if (chain === "base") {
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) throw new Error("Base token address must be a 20-byte 0x-prefixed EVM address.");
  } else if (chain === "solana") {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) throw new Error("Solana token mint must be a base58 address.");
  } else {
    throw new Error("Unsupported chain.");
  }
  return value;
}
