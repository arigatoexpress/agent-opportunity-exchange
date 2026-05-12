# API Contracts

Agent Opportunity Exchange exposes buyer-readable contracts before any paid
artifact content unlocks. The contract surface is intentionally small:

- `GET /.well-known/agent-opportunity-exchange.json` advertises discovery,
  schema, readiness, and safety endpoints.
- `GET /v1/contracts` returns `aoe.contract_bundle.v1`, a buyer-facing
  OpenAPI 3.1 and JSON Schema bundle generated from the current product, route,
  readiness, x402, and source-rights registries.
- `GET /v1/buyer-proof` returns `aoe.buyer_proof.v1`, a compact public
  "why pay" proof surface with sellability score, source risk counts, live
  route posture, featured proof routes, and hard no-side-effect boundaries.
- `GET /v1/products` returns `aoe.discovery.products.v1` with product schema
  ids, quality metadata, buyer value metrics, and source freshness/SLA caveats.
- `GET /v1/routes` returns `aoe.discovery.routes.v1` with public preview,
  quote, preflight, simulated paid-content, and separate read-only lane routes.
- `GET /v1/streams` returns `aoe.streams.discovery.v1` for the current
  x402-shaped live streams, including any explicit historical-claims posture.
- `GET /v1/readiness` returns `aoe.readiness.v1` with adapter status and
  contract coverage checks.
- `GET /v1/x402/status` returns `aoe.x402.status.v1` with payment mode,
  Base Sepolia readiness, facilitator URL, redacted pay-to address, and
  no-mainnet safety posture.
- `GET /v1/telegram/status` returns `aoe.telegram.status.v1` with Telegram
  Mini App registration posture, BotFather setup hints, and no-send/no-webhook
  boundaries.
- `POST /v1/access/preflight` returns `aoe.access.preflight.v1`-shaped access
  decisions with the buyer-visible product contract when the product exists.
- `POST /v1/telegram/register` returns `aoe.telegram.registration.v1` after
  server-side `Telegram.WebApp.initData` validation. Without
  `AOE_TELEGRAM_BOT_TOKEN`, it fails closed.
- `POST /v1/adapters/cyber/inventory-priority/preview` returns
  `sapphirealpha.cyber_inventory_priority.preview.v1` for authorized buyer JSON
  inventories. It maps submitted CVEs/assets to live KEV/EPSS/NVD defensive
  priority evidence without scans, exploit content, or credential material.
- `POST /v1/adapters/cyber/inventory-priority/report` returns
  `aoe.adapter.cyber_inventory_priority.report.v1`, wrapping the same
  authorized-inventory evidence with a derived `text/html` proof packet for
  buyer review. The HTML is generated from source-linked metadata and must not
  contain exploit instructions, credentials, scans, or raw source resale.
- `POST /v1/adapters/opportunities/public-programs/preview` returns
  `aoe.adapter.opportunity_public_programs.preview.v1` for a no-secret
  opportunity-discovery preview. It searches unauthenticated Grants.gov
  opportunity metadata and Data.gov Catalog metadata, marks SAM.gov as
  key-required, and returns derived fit signals and source links without raw
  package resale or eligibility claims.

## Product Metadata

Every sellable product must include:

- `schemaId`, for example `aoe.product.cyber_exploited_vuln_priority.v1`;
- `contractVersion`;
- `quality.qualityTier`;
- `quality.buyerValueMetrics`;
- `quality.sourceFreshnessSla`;
- `quality.auditSignals`;
- rights, source ids, disclaimers, and explicit no-live-settlement posture.

## Contract Bundle

`GET /v1/contracts` is the integration handoff for buyers, agents, and future
frontends. It includes:

- `pathContracts`: route ids, paths, methods, schema ids, source ids, product or
  workstream ids, access mode, readiness, caveats, and disabled side-effect
  flags;
- `schemaCatalog["aoe.streams.discovery.v1"]`: typed stream discovery with
  route, source ids, settlement posture, and optional historical-claims policy
  such as `productionHistoricalClaimsRequire: "alfred_vintages"`;
- `schemaCatalog`: reusable JSON Schemas keyed by existing schema ids;
- `openapi`: an OpenAPI 3.1 document with `x-aoe` extensions that repeat the
  route-level access, readiness, x402, source, and safety posture;
- `paymentBoundary`: simulated-header default, Base Sepolia x402 testnet only
  when explicitly configured, `mainnetAllowed=false`, and
  `liveSettlementAllowed=false`;
- `rightsBoundary`: the payment-is-not-permission rule, source count/risk
  summary, and prohibited use classes such as raw source resale, paywall bypass,
  credential material, unauthorized scans, trading, and money movement.

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

Telegram routes can appear only as opt-in distribution and registration
surfaces. They must keep `outboundTelegramSendsAllowed=false`, avoid webhook
registration by default, and must not claim chat-reading, production sends, or
official Mira API integration.

Opportunity public-program routes are paid-stream previews, but they must keep
the source-rights boundary visible: Grants.gov and Data.gov results are
metadata and source-link discovery, SAM.gov is key-required until explicitly
configured, and the output is not a legal eligibility determination or an
official agency endorsement.

For the market live-proof stream specifically, discovery should make the
historical-claims boundary visible before runtime: the current live macro read
mode is FRED graph CSV, `revisionAware=false`, and resale of historical or
revision-sensitive macro claims requires explicit ALFRED vintages.
The exported schema should also make freshness and provenance fail closed with
explicit `generatedAt`, `durationMs`, `sourceEvidence`, and
`reportSummary.evidenceProof` fields.

## Current Contract Gaps

- Source freshness is declared in the registry; no scheduled refresh ledger
  proves ongoing SLA attainment yet.
- Mainnet/live settlement is deliberately absent. The payment surface is
  simulated or Base Sepolia testnet only until compliance, refunds,
  KYT/sanctions, tax/accounting, buyer terms, and source-rights review are
  complete.
