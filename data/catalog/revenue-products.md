# Revenue Product Catalog

This catalog is for x402 market and relevant-data streams. Wildfire and drone
readiness are tracked as a separate read-only operational lane, not a paid x402
stream.

Each product is also exposed through `GET /v1/products` with a stable schema id,
quality metadata, buyer-facing value metrics, source freshness/SLA caveats, and
rights/source envelopes. Route-level discovery lives at `GET /v1/routes`.

## Opportunity Intel Pack

Buyer: grant writers, agencies, founders, public-safety consultants.

Value: fit-scored opportunities, deadlines, required documents, source links,
and next actions.

Schema: `aoe.product.opportunity_intel_pack.v1`.

Value metrics: fit-score inputs and deadline triage.

First sources: SAM.gov, Grants.gov, Regulations.gov, Data.gov, Census.

## Exploited Vulnerability Priority Pack

Buyer: MSPs, SMB IT, cyber insurance support, fractional security teams.

Value: ranked fix-now list with KEV, EPSS, NVD, OSV, remediation, and proof.

Schema: `aoe.product.cyber_exploited_vuln_priority.v1`.

Value metrics: fix-now queue and defensive proof pack.

First sources: CISA KEV, NVD, FIRST EPSS, OSV.

## Market Regime Evidence Pack

Buyer: analysts, founders, agents, research teams.

Value: non-advisory macro, filing, positioning, onchain, and narrative evidence
with caveats and reproducibility.

Schema: `aoe.product.market_regime_evidence_pack.v1`.

Value metrics: evidence-domain coverage and non-advisory guardrail.

First sources: FRED, CFTC COT, SEC EDGAR, GDELT, DefiLlama/CoinGecko with terms
review.

## Developer API Change Radar

Buyer: agent builders, DevRel, developer-tool consultants.

Value: source-cited API/SDK/auth/pricing changes and tested/stale snippet
status before agents write code.

Schema: `aoe.product.developer_api_change_radar.v1`.

Value metrics: change-detection fields and migration impact.

First sources: official docs, GitHub releases, package registries.
