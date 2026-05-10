# API Contracts

Agent Opportunity Exchange exposes buyer-readable contracts before any paid
artifact content unlocks. The contract surface is intentionally small:

- `GET /.well-known/agent-opportunity-exchange.json` advertises discovery,
  schema, readiness, and safety endpoints.
- `GET /v1/products` returns `aoe.discovery.products.v1` with product schema
  ids, quality metadata, buyer value metrics, and source freshness/SLA caveats.
- `GET /v1/routes` returns `aoe.discovery.routes.v1` with public preview,
  quote, preflight, simulated paid-content, and separate read-only lane routes.
- `GET /v1/readiness` returns `aoe.readiness.v1` with adapter status and
  contract coverage checks.
- `GET /v1/x402/status` returns `aoe.x402.status.v1` with payment mode,
  Base Sepolia readiness, facilitator URL, redacted pay-to address, and
  no-mainnet safety posture.
- `POST /v1/access/preflight` returns `aoe.access.preflight.v1`-shaped access
  decisions with the buyer-visible product contract when the product exists.
- `POST /v1/adapters/cyber/inventory-priority/preview` returns
  `sapphirealpha.cyber_inventory_priority.preview.v1` for authorized buyer JSON
  inventories. It maps submitted CVEs/assets to live KEV/EPSS/NVD defensive
  priority evidence without scans, exploit content, or credential material.

## Product Metadata

Every sellable product must include:

- `schemaId`, for example `aoe.product.cyber_exploited_vuln_priority.v1`;
- `contractVersion`;
- `quality.qualityTier`;
- `quality.buyerValueMetrics`;
- `quality.sourceFreshnessSla`;
- `quality.auditSignals`;
- rights, source ids, disclaimers, and explicit no-live-settlement posture.

`quality.sourceFreshnessSla` is not a guarantee that upstream public data is
always reachable. It is the buyer-facing expectation and caveat envelope for
how current a paid artifact may claim to be. If a route falls back to partial
or degraded data, the response must say so plainly.

## Route Metadata

Route discovery entries include:

- `routeId`;
- `route` and `method`;
- route-level `schemaId`;
- `access` as `public` or `simulated_x402_payment`. The paid-content route is
  simulated by default and can be official x402 testnet only when
  `AOE_PAYMENT_MODE=x402_testnet` and `AOE_X402_PAY_TO` are configured;
- `readiness`;
- product/workstream ids;
- source ids;
- buyer-facing value and caveats.

Wildfire and drone-readiness routes can appear in route discovery only as
`x402Stream: false` separate read-only lanes. They are not paid x402 products.

## Current Contract Gaps

- Product schemas are ids and TypeScript contracts, not published JSON Schema
  files yet.
- Source freshness is declared in the registry; no scheduled refresh ledger
  proves ongoing SLA attainment yet.
- Mainnet/live settlement is deliberately absent. The payment surface is
  simulated or Base Sepolia testnet only until compliance, refunds,
  KYT/sanctions, tax/accounting, buyer terms, and source-rights review are
  complete.
