import base64
import json
import os
from typing import Any

import httpx
from x402 import x402Client
from x402.http.clients import x402HttpxClient
from x402.mechanisms.svm import KeypairSigner
from x402.mechanisms.svm.exact.register import register_exact_svm_client

EXPECTED_NETWORK = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
EXPECTED_AMOUNT = "10000"
EXPECTED_ASSET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
EXPECTED_PAY_TO = "5bZdrGYAbHdbVCqw7RVUpxma22kJehaQCHhp4nHuHCyy"


def _decode_header(value: str | None, name: str) -> dict[str, Any]:
    if not value:
        raise RuntimeError(f"{name} header is missing")
    try:
        padded = value + "=" * (-len(value) % 4)
        return json.loads(base64.b64decode(padded).decode("utf-8"))
    except Exception as exc:
        raise RuntimeError(f"{name} header is not valid base64 JSON") from exc


def verify_challenge(url: str) -> dict[str, Any]:
    response = httpx.get(url, follow_redirects=False, timeout=20)
    if response.status_code != 402:
        raise RuntimeError(f"expected HTTP 402, received {response.status_code}")

    challenge = _decode_header(response.headers.get("payment-required"), "payment-required")
    if challenge.get("x402Version") != 2:
        raise RuntimeError("x402Version is not 2")

    exact = next(
        (
            item
            for item in challenge.get("accepts", [])
            if item.get("scheme") == "exact" and item.get("network") == EXPECTED_NETWORK
        ),
        None,
    )
    if exact is None:
        raise RuntimeError("expected exact Solana mainnet payment requirement not found")
    if str(exact.get("amount")) != EXPECTED_AMOUNT:
        raise RuntimeError(f"amount mismatch: expected {EXPECTED_AMOUNT}, got {exact.get('amount')}")
    if exact.get("asset") != EXPECTED_ASSET:
        raise RuntimeError(f"asset mismatch: expected {EXPECTED_ASSET}, got {exact.get('asset')}")
    if exact.get("payTo") != EXPECTED_PAY_TO:
        raise RuntimeError(f"receiver mismatch: expected {EXPECTED_PAY_TO}, got {exact.get('payTo')}")

    print("PASS: BentCrypto x402 challenge verified")
    print(
        json.dumps(
            {
                "network": exact.get("network"),
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


async def paid_get(url: str) -> tuple[dict[str, Any], str | None, dict[str, Any] | None]:
    verify_challenge(url)

    if os.getenv("CONFIRM_X402_PAYMENT") != "YES":
        raise RuntimeError(
            "payment not authorized; set CONFIRM_X402_PAYMENT=YES only when ready to spend exactly $0.01 USDC"
        )

    secret = os.getenv("SVM_PRIVATE_KEY")
    if not secret:
        raise RuntimeError("SVM_PRIVATE_KEY is missing; keep it only in your local shell")

    signer = KeypairSigner.from_base58(secret)
    client = x402Client()
    register_exact_svm_client(client, signer)

    async with x402HttpxClient(client) as http:
        response = await http.get(url, follow_redirects=False)

    if response.status_code != 200:
        raise RuntimeError(f"paid request failed with HTTP {response.status_code}: {response.text[:2000]}")

    body = response.json()
    settlement_header = response.headers.get("payment-response")
    settlement = _decode_header(settlement_header, "payment-response") if settlement_header else None
    return body, response.headers.get("x-request-id"), settlement
