# BentCrypto Developer Launch Kit

Goal: drive the first external integrations and paid x402 calls to BentCrypto's live Solana APIs.

## Tracking links

Use a different landing URL per channel so referral traffic can be compared later.

- x402 Slack: `https://bentcrypto.com/learn/x402-solana-api?utm_source=x402_slack&utm_medium=community&utm_campaign=developer_launch`
- Solana Engineering Discord: `https://bentcrypto.com/learn/solana-token-risk-api?utm_source=solana_discord&utm_medium=community&utm_campaign=developer_launch`
- r/solanadev: `https://bentcrypto.com/learn/solana-token-risk-api?utm_source=reddit_solanadev&utm_medium=community&utm_campaign=developer_launch`
- X/Twitter: `https://bentcrypto.com/agent-api?utm_source=x&utm_medium=social&utm_campaign=developer_launch`
- GitHub examples: `https://github.com/ghstaking/bentcrypto-examples`

## 1. x402 Slack

Suggested post:

> Built a small x402-native Solana intelligence service and would value feedback from other x402 builders.
>
> BentCrypto currently exposes two live paid endpoints on Solana mainnet:
> - Token Risk API — $0.01 USDC/request
> - Token Security API — $0.01 USDC/request
>
> Both use x402 v2 with no API key or subscription. The buyer gets a standard 402 challenge, signs payment locally, and retries the request.
>
> The Token Security endpoint focuses on mint/freeze authority and Token-2022 control evidence. It intentionally reports `honeypot_status: UNKNOWN` because exit validation is not enabled in the current beta.
>
> I published working JavaScript/Python examples here:
> https://github.com/ghstaking/bentcrypto-examples
>
> Integration guide:
> https://bentcrypto.com/learn/x402-solana-api?utm_source=x402_slack&utm_medium=community&utm_campaign=developer_launch
>
> Feedback on the x402 flow, response contract, and what pre-trade signals agents would actually pay for would be especially useful.

Best intent: builder feedback, not sales copy.

## 2. Solana Engineering Discord

Suggested post:

> Looking for feedback from Solana bot/agent builders.
>
> I launched two lightweight Solana intelligence endpoints designed to be called directly before an automated action:
>
> **Token Risk** — scored risk + confidence + holder/liquidity/authority signals  
> **Token Security** — mint/freeze authority and Token-2022 control analysis
>
> Price is $0.01 USDC per request through x402 on Solana mainnet. No account or API key is required.
>
> Example clients: https://github.com/ghstaking/bentcrypto-examples
> Guide: https://bentcrypto.com/learn/solana-token-risk-api?utm_source=solana_discord&utm_medium=community&utm_campaign=developer_launch
>
> The current security beta does not perform exit validation, so honeypot status remains UNKNOWN. I am specifically looking for feedback on which pre-trade checks are useful enough for autonomous agents to call repeatedly.

## 3. r/solanadev

Suggested title:

`Built a $0.01 x402 Solana token-risk API for bots/agents — looking for developer feedback`

Suggested body:

> I have been working on a small Solana API service aimed at automated agents and trading tooling rather than a consumer dashboard.
>
> The two live endpoints are:
>
> - Token Risk: risk score, confidence and supporting on-chain signals
> - Token Security: authority and Token-2022 control analysis
>
> Each request costs $0.01 USDC via x402 on Solana mainnet. There are no API keys or subscriptions; the client handles the 402 challenge and payment locally.
>
> I also made the integration examples public so the payment flow can be inspected without trusting a black-box SDK:
> https://github.com/ghstaking/bentcrypto-examples
>
> Technical walkthrough:
> https://bentcrypto.com/learn/solana-token-risk-api?utm_source=reddit_solanadev&utm_medium=community&utm_campaign=developer_launch
>
> One limitation I want to be explicit about: the Token Security beta does not currently perform exit validation, so it reports honeypot status as UNKNOWN rather than claiming a token is safe.
>
> I would appreciate feedback from anyone building Solana bots/agents: which pre-trade signals would you actually pay a cent to query repeatedly?

Before posting: review the current subreddit rules and use an appropriate self-promotion/showcase flair if required.

## 4. X / Twitter

Single post:

> Built BentCrypto for agents that need a quick Solana pre-trade check without an API subscription.
>
> $0.01 USDC/request via x402:
> • Token Risk
> • Token Security / Token-2022 controls
>
> No API key. Solana mainnet. JS + Python examples are public.
>
> https://bentcrypto.com/agent-api?utm_source=x&utm_medium=social&utm_campaign=developer_launch
> https://github.com/ghstaking/bentcrypto-examples

Thread follow-up:

> The design target is simple: an autonomous agent should be able to decide whether $0.01 of intelligence is worth buying without asking its owner to create an account or subscription.

Second follow-up:

> Current limitation: Token Security does not perform exit validation in beta, so honeypot status stays UNKNOWN. The endpoint is focused on observable on-chain token controls rather than claiming trade safety.

## Launch order

1. x402 Slack
2. Solana Engineering Discord
3. r/solanadev
4. X/Twitter

Post to one or two channels first, observe traffic/calls, then continue. Avoid posting identical copy everywhere at the same time.

## First commercial milestone

Target: **100 external paid API requests**.

Track:

`community post -> landing-page visits -> 402 challenges -> settlements -> successful 200 responses -> repeat callers`

The first priority is learning which endpoint earns repeat calls, not maximizing short-term dollar revenue.
