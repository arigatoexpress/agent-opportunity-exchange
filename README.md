# Agent Opportunity Exchange

Agent Opportunity Exchange is a separate greenfield repo spun out from the core thesis of the Sapphire-era work: sell useful, rights-cleared market and relevant-data streams through an agent-native payment surface.

The first wedge is not another monolith, dashboard maze, crawler, trading bot, wildfire command surface, or drone-ops promise. It is a small product kernel for x402 data streams:

- opportunity intelligence for grants, RFPs, local programs, and regulatory deadlines;
- exploited-vulnerability priority reports for defensive teams;
- market-regime and filing-change evidence packs, with no trade execution;
- developer API-change radar for builders and agents.

Wildfire and drone-readiness work is a separate read-only operational research lane, not an x402 stream.

Every product starts from a source-rights envelope. x402 is the payment rail, not the permission model.

## Product Contracts

The API is discoverable before purchase:

- `GET /v1/contracts` returns `aoe.contract_bundle.v1`, a buyer-facing OpenAPI
  3.1 and JSON Schema bundle generated from the current product, route,
  readiness, x402, and source-rights registries.
- `GET /v1/products` returns `aoe.discovery.products.v1` product contracts with
  schema ids, quality metadata, buyer-facing value metrics, source freshness/SLA
  caveats, rights, source ids, and disclaimers.
- `GET /v1/routes` returns `aoe.discovery.routes.v1` route contracts for public
  previews, quotes, preflight, simulated paid content, and separate read-only
  lanes.
- `GET /v1/readiness` reports whether product and route contract coverage is
  buyer-discovery ready.
- `POST /v1/access/preflight` returns the product contract alongside price and
  source checks when the artifact exists.

See [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md) for the current contract
shape and residual gaps.

## Quick Start

```bash
npm install
npm run verify
npm run dev
```

The default server listens on `http://127.0.0.1:4402`.

## Core Endpoints

- `GET /health`
- `GET /.well-known/agent-opportunity-exchange.json`
- `GET /v1/contracts`
- `GET /v1/products`
- `GET /v1/routes`
- `GET /v1/streams`
- `GET /v1/sources`
- `GET /v1/separate-workstreams`
- `GET /v1/artifacts`
- `GET /v1/readiness`
- `GET /v1/x402/status`
- `GET /v1/artifacts/:id/preview`
- `GET /v1/artifacts/:id/quote`
- `POST /v1/access/preflight`
- `POST /v1/adapters/cyber/vuln-priority/preview`
- `POST /v1/adapters/wildfire/alerts/preview`
- `POST /v1/adapters/wildfire/wfigs-perimeters/preview`
- `POST /v1/streams/market-context/preview`
- `POST /v1/adapters/markets/sec-filings/preview`
- `POST /v1/adapters/markets/fred-series/preview`
- `GET /v1/artifacts/:id/content`

x402 artifact content returns `402 Payment Required` until the caller presents a simulated payment header:

```bash
curl -i http://127.0.0.1:4402/v1/artifacts/aoe_cyber_kev_epss_priority/content
```

Then retry with the `work_order_id` returned by the quote or 402 response:

```bash
curl -s \
  -H 'X-AOE-Payment: simulated:<work_order_id>' \
  http://127.0.0.1:4402/v1/artifacts/aoe_cyber_kev_epss_priority/content
```

This is deliberately simulated/testnet-only. No live settlement, trading, Telegram send, production data write, or external scan is enabled.

Simulated paid access appends non-secret receipt records to `data/receipts/receipts.jsonl`, which is ignored by git.

## Official x402 Testnet

The repo now has the official `@x402/hono`, `@x402/core`, `@x402/evm`, and
`@x402/fetch` packages wired behind an explicit testnet gate. Default mode is
still simulated. To test real x402 headers on Base Sepolia:

```bash
npm run x402:burner -- --write-env
set -a; source .env.x402.local; set +a
npm run dev
```

In another terminal, fund the buyer burner with Base Sepolia test USDC only,
then run:

```bash
set -a; source .env.x402.local; set +a
npm run x402:testnet:fetch -- aoe_cyber_kev_epss_priority
```

The server needs only `AOE_X402_PAY_TO`; it must never receive the buyer private
key. `GET /v1/x402/status` reports whether the official testnet middleware is
active. Mainnet network ids are blocked in code and tests.

The first live read-only source adapter is defensive cyber prioritization:

```bash
curl -s \
  -X POST http://127.0.0.1:4402/v1/adapters/cyber/vuln-priority/preview \
  -H 'Content-Type: application/json' \
  -d '{"cves":["CVE-2021-44228","CVE-2023-34362"]}'
```

It calls public CISA KEV, FIRST EPSS, and NVD APIs. It does not scan targets and does not return exploit instructions.

The same adapter is available as a CLI:

```bash
npm run cyber:priority -- CVE-2021-44228 CVE-2023-34362
npm run cyber:priority -- --input ./asset-inventory.csv --output ./cyber-priority.json
npm run cyber:priority -- --format html --output ./cyber-priority.html CVE-2021-44228
```

The separate wildfire/regional lane previews public NWS alerts by state or point:

```bash
curl -s \
  -X POST http://127.0.0.1:4402/v1/adapters/wildfire/alerts/preview \
  -H 'Content-Type: application/json' \
  -d '{"area":"CO"}'
```

It is not part of the x402 stream catalog and does not send alerts, dispatch resources, authorize flights, or replace local emergency channels.

NIFC/WFIGS current perimeter previews use the public ArcGIS service:

```bash
curl -s \
  -X POST http://127.0.0.1:4402/v1/adapters/wildfire/wfigs-perimeters/preview \
  -H 'Content-Type: application/json' \
  -d '{"state":"CO","limit":5}'
```

The first market-intelligence adapter previews public SEC EDGAR filings:

The featured x402-shaped stream combines SEC recent filing metadata and FRED
macro observations into one source-cited context payload:

```bash
curl -s \
  -X POST http://127.0.0.1:4402/v1/streams/market-context/preview \
  -H 'Content-Type: application/json' \
  -d '{"ticker":"AAPL","seriesIds":["FEDFUNDS","UNRATE","CPIAUCSL"],"filingLimit":3,"seriesLimit":2}'
```

It returns `schemaVersion: sapphirealpha.market_context.v1`, SEC filing links,
macro observations, highlights, source ids, and caveats. It is non-advisory
market context, not trading advice or execution.

```bash
curl -s \
  -X POST http://127.0.0.1:4402/v1/adapters/markets/sec-filings/preview \
  -H 'Content-Type: application/json' \
  -d '{"ticker":"AAPL","forms":["10-K","10-Q","8-K"],"limit":5}'
```

It is document intelligence only: no portfolio personalization, no trade advice, and no execution.

Macro evidence previews can read public FRED graph CSV exports without a key:

```bash
curl -s \
  -X POST http://127.0.0.1:4402/v1/adapters/markets/fred-series/preview \
  -H 'Content-Type: application/json' \
  -d '{"seriesIds":["FEDFUNDS","CPIAUCSL","UNRATE"],"limit":3}'
```

For revision-aware production research, upgrade this to FRED/ALFRED API usage with explicit vintages.

## Product Boundary

The x402 product sells normalization, prioritization, provenance, checklists, summaries, and machine-readable evidence streams for market and relevant data. It does not sell wildfire/drone operations, raw source resale, paywall bypass, legal advice, investment advice, live trade execution, exploit instructions, credential dumps, or unauthorized scanning.

## Why This Exists

Sapphire proved that the valuable center was not the pile of integrations. The durable idea is a rights-aware data-stream broker for agents and humans: public previews, x402 quotes, receipts, provenance, and strict safety controls.

See [docs/PRODUCT_THESIS.md](docs/PRODUCT_THESIS.md), [docs/SAFETY_BOUNDARIES.md](docs/SAFETY_BOUNDARIES.md), and [docs/SAPPHIRE_TEARDOWN_PLAN.md](docs/SAPPHIRE_TEARDOWN_PLAN.md).
