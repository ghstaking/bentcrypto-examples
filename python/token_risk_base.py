import asyncio
import base64
import json
import os
import re

import httpx
from eth_account import Account
from x402 import x402Client
from x402.http.clients import x402HttpxClient
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact.register import register_exact_evm_client

EXPECTED_NETWORK = "eip155:8453"
EXPECTED_AMOUNT = "10000"
EXPECTED_ASSET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".lower()
EXPECTED_PAY_TO = "0x2E0f8B55F4a224a6017626BE5D862cb8eCb74f3b".lower()
DEFAULT_TOKEN = "0x4200000000000000000000000000000000000006"


def decode_header(value: str | None, name: str) -> dict:
    if not value:
        raise RuntimeError(f"{name} header is missing")
    try:
        padded = value + "=" * (-len(value) % 4)
        return json.loads(base64.b64decode(padded).decode("utf-8"))
    except Exception as exc:
        raise RuntimeError(f"{name} header is not valid base64 JSON") from exc


def endpoint() -> str:
    token = os.getenv("BASE_TOKEN_ADDRESS", DEFAULT_TOKEN).strip()
    return f"https://api.bentcrypto.com/v1/token/risk?chain=base&address={token}"


def verify_challenge(url: str) -> dict:
    response = httpx.get(url, follow_redirects=False, timeout=20)
    if response.status_code != 402:
        raise RuntimeError(f"expected HTTP 402, received {response.status_code}: {response.text[:500]}")

    challenge = decode_header(response.headers.get("payment-required"), "payment-required")
    if challenge.get("x402Version") != 2:
        raise RuntimeError(f"unexpected x402 version: {challenge.get('x402Version')}")

    exact = next(
        (
            item
            for item in challenge.get("accepts", [])
            if item.get("scheme") == "exact" and item.get("network") == EXPECTED_NETWORK
        ),
        None,
    )
    if exact is None:
        raise RuntimeError(f"no exact {EXPECTED_NETWORK} payment option in challenge")
    if str(exact.get("amount")) != EXPECTED_AMOUNT:
        raise RuntimeError(f"unexpected amount: {exact.get('amount')}")
    if str(exact.get("asset", "")).lower() != EXPECTED_ASSET:
        raise RuntimeError(f"unexpected Base USDC asset: {exact.get('asset')}")
    if str(exact.get("payTo", "")).lower() != EXPECTED_PAY_TO:
        raise RuntimeError(f"unexpected receiver: {exact.get('payTo')}")

    print("PASS: BentCrypto Base x402 challenge verified")
    print(
        json.dumps(
            {
                "analysis_chain": "base",
                "payment_network": exact.get("network"),
                "amount_usdc_base_units": exact.get("amount"),
                "amount_usd": "0.01",
                "asset": exact.get("asset"),
                "pay_to": exact.get("payTo"),
                "resource": challenge.get("resource", {}).get("url", url),
            },
            indent=2,
        )
    )
    return challenge


async def main() -> None:
    url = endpoint()
    verify_challenge(url)

    if os.getenv("BENTCRYPTO_CHALLENGE_ONLY") == "YES":
        print("Challenge-only mode: no payment was authorized or submitted.")
        return

    if os.getenv("CONFIRM_X402_PAYMENT") != "YES":
        raise RuntimeError(
            "payment not authorized; set CONFIRM_X402_PAYMENT=YES only when ready to spend exactly $0.01 USDC"
        )

    private_key = os.getenv("EVM_PRIVATE_KEY", "").strip()
    if not re.fullmatch(r"0x[0-9a-fA-F]{64}", private_key):
        raise RuntimeError("EVM_PRIVATE_KEY must be 0x followed by 64 hexadecimal characters")

    account = Account.from_key(private_key)
    client = x402Client()
    register_exact_evm_client(client, EthAccountSigner(account))

    async with x402HttpxClient(client) as http:
        response = await http.get(url, follow_redirects=False)
        await response.aread()

    if response.status_code != 200:
        raise RuntimeError(f"paid request failed with HTTP {response.status_code}: {response.text[:2000]}")

    body = response.json()
    settlement = decode_header(response.headers.get("payment-response"), "payment-response")
    if settlement.get("success") is not True:
        raise RuntimeError("settlement did not report success=true")
    if settlement.get("network") != EXPECTED_NETWORK:
        raise RuntimeError(f"unexpected settlement network: {settlement.get('network')}")
    if str(settlement.get("payer", "")).lower() != account.address.lower():
        raise RuntimeError(f"unexpected settlement payer: {settlement.get('payer')}")
    if not re.fullmatch(r"0x[0-9a-fA-F]{64}", str(settlement.get("transaction", ""))):
        raise RuntimeError("settlement transaction hash is missing or invalid")

    print("PASS: paid Base x402 request returned HTTP 200")
    print(
        json.dumps(
            {
                "request_id": response.headers.get("x-request-id"),
                "payer": account.address,
                "settlement": settlement,
                "result": {
                    "chain": body.get("chain"),
                    "address": body.get("address"),
                    "risk_score": body.get("risk", {}).get("score"),
                    "risk_level": body.get("risk", {}).get("level"),
                    "coverage_percent": body.get("confidence", {}).get("coverage_percent"),
                },
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    asyncio.run(main())
