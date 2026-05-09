# Agent Opportunity Exchange

Agent Opportunity Exchange is a separate greenfield repo spun out from the core thesis of the Sapphire-era work: sell useful, rights-cleared intelligence artifacts through an agent-native payment surface.

The first wedge is not another monolith, dashboard maze, crawler, trading bot, or drone-ops promise. It is a small product kernel for paid intelligence packets:

- opportunity intelligence for grants, RFPs, local programs, and regulatory deadlines;
- regional wildfire and public-safety evidence packs;
- exploited-vulnerability priority reports for defensive teams;
- market-regime and filing-change evidence packs, with no trade execution;
- developer API-change radar for builders and agents.

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
- `GET /v1/artifacts`
- `GET /v1/artifacts/:id/preview`
- `GET /v1/artifacts/:id/quote`
- `POST /v1/access/preflight`
- `POST /v1/adapters/cyber/vuln-priority/preview`
- `GET /v1/artifacts/:id/content`

Full artifact content returns `402 Payment Required` until the caller presents a simulated payment header:

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
```

## Product Boundary

The product sells normalization, prioritization, provenance, checklists, summaries, and machine-readable evidence packs. It does not sell raw source resale, paywall bypass, legal advice, investment advice, live trade execution, exploit instructions, credential dumps, or unauthorized scanning.

## Why This Exists

Sapphire proved that the valuable center was not the pile of integrations. The durable idea is a rights-aware intelligence broker for agents and humans: public previews, paid artifacts, source registry, quotes, receipts, provenance, and strict safety controls.

See [docs/PRODUCT_THESIS.md](docs/PRODUCT_THESIS.md), [docs/SAFETY_BOUNDARIES.md](docs/SAFETY_BOUNDARIES.md), and [docs/SAPPHIRE_TEARDOWN_PLAN.md](docs/SAPPHIRE_TEARDOWN_PLAN.md).
