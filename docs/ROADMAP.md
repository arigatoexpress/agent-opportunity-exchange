# Roadmap

## Now

- Keep the repo separate from Sapphire.
- Keep payments simulated/testnet-only.
- Prove the artifact broker surface:
  - source registry;
  - product registry;
  - artifact previews;
  - quote endpoint;
  - preflight controls;
  - x402-style 402 challenge;
  - simulated receipt.
- Add the first live read-only adapter for CISA KEV, FIRST EPSS, and NVD
  defensive vulnerability prioritization.
- Add a local append-only receipt ledger.
- Add a CLI for defensive cyber priority reports.

## 30 Days

- Replace more seeded static artifacts with live source adapters for:
  - NASA FIRMS;
  - NWS alerts;
  - SEC EDGAR;
  - FRED.
- Add a simple artifact-generation CLI for the non-cyber products.
- Add the first buyer-facing HTML report template.
- Produce three demo packets:
  - exploited vulnerability priority pack;
  - regional wildfire readiness pack;
  - opportunity intelligence pack.

## 60 Days

- Add MCP tools:
  - `aoe_search`;
  - `aoe_quote`;
  - `aoe_preflight`;
  - `aoe_fetch_paid`;
  - `aoe_receipt`.
- Add Postgres/pgvector for catalog search.
- Add PostGIS for regional/wildfire geometry.
- Add source-health jobs and drift warnings.
- Convert the simulated x402 shim to official testnet x402 middleware.

## 90 Days

- Launch self-serve public previews.
- Add paid pilot packaging for MSPs, grant writers, and wildfire-planning buyers.
- Add partner/licensed source workflows for yellow sources.
- Add buyer terms, refund policy, KYT/sanctions workflow, and tax/accounting export before mainnet settlement.

## Deferred

- Live trading.
- Real drone operations.
- Production Telegram.
- Auth-gated scraping.
- General-purpose web crawling.
- Any PGF/THO integration.
