const baseUrl = (process.env.BENTCRYPTO_API_URL || "https://api.bentcrypto.com").replace(/\/$/, "");
const address = process.env.BASE_TOKEN_ADDRESS || "0x4200000000000000000000000000000000000006";
const url = `${baseUrl}/mpp/v1/token/risk?chain=base&address=${encodeURIComponent(address)}`;

const response = await fetch(url, { headers: { Accept: "application/json" } });
if (response.status !== 402) throw new Error(`Expected HTTP 402, received ${response.status}: ${await response.text()}`);

const challenge = response.headers.get("www-authenticate") || "";
if (!/^Payment\s/i.test(challenge)) throw new Error("MPP Payment challenge is missing");
if (!/method="evm"/i.test(challenge)) throw new Error("Expected MPP method=evm");
if (!/intent="charge"/i.test(challenge)) throw new Error("Expected MPP intent=charge");

console.log(challenge);
console.log("Challenge verified. No payment credential was submitted.");
