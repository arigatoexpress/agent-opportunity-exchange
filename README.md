# Agent Opportunity Exchange

Agent Opportunity Exchange is a separate greenfield repo spun out from the core thesis of the Sapphire-era work: sell useful, rights-cleared market and relevant-data streams through an agent-native payment surface.

The first wedge is not another monolith, dashboard maze, crawler, trading bot, wildfire command surface, or drone-ops promise. It is a small product kernel for x402 data streams:

- opportunity intelligence for grants, RFPs, local programs, and regulatory deadlines;
- exploited-vulnerability priority reports for defensive teams;
- market-regime and filing-change evidence packs, with no trade execution;
- developer API-change radar for builders and agents.

Wildfire and drone-readiness work is a separate read-only operational research lane, not an x402 stream.

Every product starts from a source-rights envelope. x402 is the payment rail, not the permission model.

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
- `GET /v1/products`
- `GET /v1/sources`
- `GET /v1/separate-workstreams`
- `GET /v1/artifacts`
- `GET /v1/readiness`
- `GET /v1/artifacts/:id/preview`
- `GET /v1/artifacts/:id/quote`
- `POST /v1/access/preflight`
- `POST /v1/adapters/cyber/vuln-priority/preview`
- `POST /v1/adapters/wildfire/alerts/preview`
- `POST /v1/adapters/wildfire/wfigs-perimeters/preview`
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
