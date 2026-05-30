# Agent Opportunity Exchange

Marketplace for agent-discoverable intelligence products. An x402-ready artifact broker that sells rights-cleared data streams — defensive cyber priority, market context, opportunity programs — with public previews, simulated payment, and strict safety controls.

## What this does

AOE is a Hono/TypeScript API that hosts discoverable intelligence products. Buyers can preview artifacts, request quotes, and (in testnet mode) pay via x402. Every product starts from a source-rights envelope. No live settlement, trading, or Telegram sends are enabled.

## Quick start

```bash
npm install
npm run verify
npm run dev
```

Default URL: `http://127.0.0.1:4402`

## Architecture

```
Buyer / Agent  ◄──►  Hono API  ◄──►  Product catalog (cyber, market, opportunity)
                    │
                    ├── x402 middleware (simulated / testnet)
                    ├── Source-rights registry
                    └── Readiness / preview-safety gates
```

## Key features

- **Product discovery** — `GET /v1/contracts`, `/v1/products`, `/v1/routes`, `/v1/streams`
- **Public previews** — sample data before purchase
- **x402 payment** — simulated by default; optional Base Sepolia testnet
- **Cyber priority** — CISA KEV + FIRST EPSS + NVD defensive reports
- **Market context** — SEC EDGAR + FRED macro evidence packs (research-only)
- **Preview safety** — explicit gates before calling any URL preview-ready
- **Telegram Mini App** — opt-in registration surface (no sends without bot token)

## Tech stack

- Node.js ≥ 22
- TypeScript 5.9+
- Hono
- x402 SDK (`@x402/hono`, `@x402/core`, `@x402/evm`)
- Vitest + Playwright
- Viem

## Example usage

**Preview a cyber report:**
```bash
curl -s -X POST http://127.0.0.1:4402/v1/adapters/cyber/vuln-priority/preview \
  -H 'Content-Type: application/json' \
  -d '{"cves":["CVE-2021-44228"]}'
```

**Market live proof:**
```bash
curl -s -X POST http://127.0.0.1:4402/v1/streams/market-context/live-proof \
  -H 'Content-Type: application/json' \
  -d '{"ticker":"AAPL","seriesIds":["FEDFUNDS"]}'
```

**Simulated paid access:**
```bash
curl -i http://127.0.0.1:4402/v1/artifacts/aoe_cyber_kev_epss_priority/content
# Retry with work_order_id from 402 response:
curl -s -H 'X-AOE-Payment: simulated:<work_order_id>' \
  http://127.0.0.1:4402/v1/artifacts/aoe_cyber_kev_epss_priority/content
```

**x402 testnet (Base Sepolia):**
```bash
npm run x402:burner -- --write-env
set -a; source .env.x402.local; set +a
npm run dev
npm run x402:testnet:fetch -- aoe_cyber_kev_epss_priority
```

## Agent collaborators

See [AGENTS.md](AGENTS.md) for hard boundaries, implementation rules, and product taste.

## License

MIT
