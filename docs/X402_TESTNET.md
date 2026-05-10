# x402 Testnet Runbook

This repo uses the official x402 TypeScript packages behind an explicit
testnet-only gate:

- `@x402/hono` for the protected Hono route middleware;
- `@x402/core` for payment headers and facilitator clients;
- `@x402/evm` for the Exact EVM scheme;
- `@x402/fetch` for the buyer-side paid fetch helper.

The public status and contract-bundle APIs also expose a disabled
`solana-pay-sh-svm-candidate` rail. That rail is a roadmap contract only, based
on Solana Foundation's 2026-05-05 Pay.sh announcement with Google Cloud and the
official Solana x402 developer guide:

- <https://solana.com/uk/news/solana-foundation-launches-pay-sh-in-collaboration-with-google-cloud>
- <https://solana.com/developers/guides/getstarted/intro-to-x402>
- <https://github.com/coinbase/x402>

## Safety Defaults

- Default mode is `AOE_PAYMENT_MODE=simulated`.
- Official x402 middleware only starts when `AOE_PAYMENT_MODE=x402_testnet`
  and `AOE_X402_PAY_TO` are set.
- The only allowed network is Base Sepolia: `eip155:84532`.
- The default facilitator is `https://x402.org/facilitator`.
- Mainnet network ids are blocked by tests and config validation.
- The server only needs a receiving address; buyer private keys stay local.
- Solana/Pay.sh is not enabled yet: no wallet, facilitator, Google Cloud API
  proxy, or Pay.sh provider credential is called from this repo.
- Payment is access control only. It does not grant rights to resell, scrape,
  bypass, or redistribute restricted provider datasets.

## Local Test Flow

Generate a seller receiver and buyer burner pair:

```bash
npm run x402:burner -- --write-env
```

Load the generated ignored env file:

```bash
set -a; source .env.x402.local; set +a
```

Start the API:

```bash
npm run dev
```

Check the mode:

```bash
curl -s http://127.0.0.1:4402/v1/x402/status | jq .
```

Fund the buyer burner with Base Sepolia test USDC only. Then run a paid fetch:

```bash
npm run x402:testnet:fetch -- aoe_cyber_kev_epss_priority
```

The buyer script enforces `eip155:84532` and `AOE_X402_CLIENT_MAX_USD` before it
lets the x402 client create a payment payload.

## Production Posture

Production may expose `/v1/x402/status`, quote endpoints, and simulated paid
content, but should not enable `AOE_PAYMENT_MODE=x402_testnet` until a burner
receiver address and testnet-funding flow are intentionally set. Mainnet remains
out of scope.

## Pay.sh / Solana Roadmap Contract

`GET /v1/x402/status` and `GET /v1/contracts` expose:

- `rails[].railId=base-sepolia-official-x402` for the current explicit
  Base Sepolia testnet path;
- `rails[].railId=solana-pay-sh-svm-candidate` for a planned Solana/SVM quote
  and provider-catalog path;
- `paySh.providerCatalogPlanned=true`;
- `paySh.liveWalletsAllowed=false`;
- `paySh.liveProviderCredentialsAllowed=false`.

The next safe implementation step is a provider catalog schema with endpoint,
network, token, facilitator, price, quota, source-rights envelope, and audit
posture. It should stay quote-only until a separate testnet plan covers wallet
funding, settlement verification, refunds, accounting, provider terms, and
operator rollback.
