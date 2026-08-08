import asyncio
import json
import sys

from _client import paid_get


async def main() -> None:
    mint = sys.argv[1] if len(sys.argv) > 1 else "So11111111111111111111111111111111111111112"
    url = f"https://api.bentcrypto.com/v1/token/risk?chain=solana&address={mint}"
    body, request_id, settlement = await paid_get(url)

    print("PASS: paid Token Risk request returned HTTP 200")
    print(
        json.dumps(
            {
                "request_id": request_id,
                "address": body.get("address"),
                "risk_score": body.get("risk", {}).get("score"),
                "risk_level": body.get("risk", {}).get("level"),
                "coverage_percent": body.get("confidence", {}).get("coverage_percent"),
                "settlement": settlement,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    asyncio.run(main())
