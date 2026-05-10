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
- Add an HTML report renderer for the first sellable artifact.
- Add the first wildfire/regional read-only adapter for NWS alerts.
- Add CSV/JSON asset-inventory intake for defensive cyber reports.
- Add SEC EDGAR recent-filings preview for market intelligence.
- Add FRED no-key graph CSV preview for macro evidence.
- Add the first combined x402-shaped market stream: SEC filings plus FRED macro
  context.
- Add NIFC/WFIGS current-perimeters preview for the separate wildfire lane.
- Add public payment-rail discovery for simulated x402, Base Sepolia x402
  testnet, and Pay.sh/Solana sandbox-roadmap entries.

## 30 Days

- Keep wildfire/drone work in a separate read-only lane:
  - NASA FIRMS;
  - no x402 stream catalog entry;
  - no dispatch or flight operations.
- FRED/ALFRED vintage-aware API support.
- Add package/SBOM parsing on top of the current CVE-list cyber CLI.
- Add a simple artifact-generation CLI for the x402 data-stream products.
- Add buyer-facing HTML report templates for opportunity and market intel.
- Produce three demo packets:
  - exploited vulnerability priority pack;
  - opportunity intelligence pack;
  - market-regime evidence pack.

## 60 Days

- Add MCP tools:
  - `aoe_search`;
  - `aoe_quote`;
  - `aoe_preflight`;
  - `aoe_fetch_paid`;
  - `aoe_receipt`.
- Add Postgres/pgvector for catalog search.
- Add geospatial tooling only inside the separate wildfire lane.
- Add source-health jobs and drift warnings.
- Convert the simulated x402 shim to official testnet x402 middleware.
- Prototype a Pay.sh sandbox provider spec for one public preview endpoint,
  keeping paid-content unlock on the existing simulated/Base Sepolia gate.

## 90 Days

- Launch self-serve public previews.
- Add paid pilot packaging for MSPs, grant writers, and market/relevant-data buyers.
- Add partner/licensed source workflows for yellow sources.
- Add buyer terms, refund policy, KYT/sanctions workflow, and tax/accounting export before mainnet settlement.
- Revisit Solana/Pay.sh mainnet only after compliance, accounting, buyer terms,
  source-rights, and deployment review.

## Deferred

- Live trading.
- Real drone operations.
- Production Telegram.
- Auth-gated scraping.
- General-purpose web crawling.
- Any PGF/THO integration.
