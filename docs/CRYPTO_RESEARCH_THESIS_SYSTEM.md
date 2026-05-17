# Crypto Research Thesis System

Built May 16, 2026 as a rights-cleared crypto research lane inside Agent
Opportunity Exchange.

## What It Does

The system produces non-advisory crypto thesis packets from:

- Bankless public podcast RSS metadata;
- optional Bankless Onchain MCP configuration;
- The DeFi Report public metadata and methodology tags;
- CoinGecko market and price-chart data;
- DeFiLlama protocol, fees, DEX-volume, and stablecoin-supply data.

It is inspired by public Michael Nadeau / The DeFi Report research structure,
but it does not copy article bodies, charts, tables, subscriber text, or
paywalled content.

## Routes

- `GET /v1/mcp/bankless/manifest`
  - Reports the optional Bankless Onchain MCP command:
    `npx -y @bankless/onchain-mcp@1.0.6`.
  - Requires `BANKLESS_API_TOKEN` in the user's MCP client for live Bankless
    calls.
  - AOE does not store or echo the token.

- `GET /v1/research/defi-report/inventory`
  - Returns a public metadata inventory and extracted methodology taxonomy.
  - The inventory mode is public search-index plus user browser tab metadata.
  - Direct headless fetches hit a Vercel browser checkpoint; no bypass is used.

- `POST /v1/adapters/bankless/podcast/recent`
  - Body: `{ "query": "Zcash", "limit": 6 }`
  - Returns public RSS metadata, episode links, short summaries, and topic tags.

- `POST /v1/streams/crypto-thesis/preview`
  - Body:
    `{ "assetSymbol": "ZEC", "coingeckoId": "zcash", "banklessQuery": "Zcash", "days": 90, "includeLandscape": true }`
  - Optional `protocolSlug` adds DeFiLlama TVL and fees, for example
    `hyperliquid-perps`.

## Boundaries

- Research and education only.
- No buy/sell/hold, price targets, portfolio personalization, trading, wallet
  signing, live settlement, or money movement.
- No Telegram sends.
- No paywall bypass, browser-checkpoint bypass, full article reproduction, full
  transcript resale, or raw source redistribution.

## Verification

Commands run:

- `npm run verify`
- `npm run build`
- `npm run browser:smoke`
- live ZEC route smoke against `http://127.0.0.1:4402/v1/streams/crypto-thesis/preview`

Latest observed ZEC smoke output:

- `schemaId=aoe.crypto_research_thesis.v1`
- `banklessMatches=3`
- `defiReportCount=16`
- `evidenceCompleteness=83`
- live settlement disabled
