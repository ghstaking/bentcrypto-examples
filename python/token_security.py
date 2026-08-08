import asyncio
import json
import sys

from _client import paid_get


async def main() -> None:
    mint = sys.argv[1] if len(sys.argv) > 1 else "So11111111111111111111111111111111111111112"
    url = f"https://api.bentcrypto.com/v1/token/security?chain=solana&address={mint}"
    body, request_id, settlement = await paid_get(url)

    print("PASS: paid Token Security request returned HTTP 200")
    print(
        json.dumps(
            {
                "request_id": request_id,
                "address": body.get("address"),
                "security_score": body.get("security", {}).get("score"),
                "security_level": body.get("security", {}).get("level"),
                "coverage_percent": body.get("confidence", {}).get("coverage_percent"),
                "honeypot_status": body.get("security", {}).get("honeypot_status"),
                "exit_validation_performed": body.get("metadata", {}).get("exit_validation_performed"),
                "settlement": settlement,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    asyncio.run(main())
