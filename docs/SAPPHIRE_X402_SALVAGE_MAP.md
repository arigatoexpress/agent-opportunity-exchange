# Sapphire x402 Salvage Map

This map identifies what to salvage from Sapphire's mature simulated x402 work
without making Sapphire the destination architecture.

## Source Files Read

- `/Users/aribs/Code/Sapphire/docs/ops/x402-product-spine.md`
- `/Users/aribs/Code/Sapphire/config/x402_products.json`
- `/Users/aribs/Code/Sapphire/config/x402_source_registry.json`
- `/Users/aribs/Code/Sapphire/config/agentwiki_artifacts.json`
- `/Users/aribs/Code/Sapphire/tools/agentwiki_x402_mcp/SKILL.md`

## Keep As Reference

| Sapphire surface | Salvage into AOE | Notes |
| --- | --- | --- |
| `config/x402_products.json` | Product categories, TTLs, source ids, price-shape examples | Do not copy inference or local-mesh products as AOE products. |
| `config/x402_source_registry.json` | Source-rights envelope fields and source readiness posture | AOE already has the right source-rights rule; normalize fields rather than copy Python loaders. |
| `config/agentwiki_artifacts.json` | Opportunity/regulatory/local/developer brief concepts | These are the strongest fit for AOE's money-moving builder utility wedge. |
| `docs/ops/x402-product-spine.md` | Receipt policy, unpaid denial, simulated/testnet posture, discovery routes | Preserve the hard safety posture: no live settlement, trading, Telegram, or production mutation. |
| `tools/agentwiki_x402_mcp/SKILL.md` | MCP tool shape for search, quote, fetch, receipt | Rebuild in TypeScript/MCP against AOE routes rather than wrapping Sapphire dashboard routes. |

## Product Decisions

| Sapphire product | AOE disposition | Rationale |
| --- | --- | --- |
| `agentwiki_builder_brief` | Port first | Direct match for AOE: grants, RFPs, regulatory deadlines, local programs, API-change radar. |
| `cyber_exploit_risk` | Already partially ported as defensive cyber priority | Keep defensive-only and source-cited. |
| `market_regime_report` | Port only as non-advisory market/macro evidence packs | AOE must avoid trading signals, personalized advice, and execution. |
| `research_pack_basic` | Split into explicit product families | Too broad as a product. Use opportunity, cyber, market, developer, or regional contracts. |
| `regional_brief` | Keep as separate regional/wildfire-adjacent lane unless licensed | Avoid turning wildfire/drone operations into paid x402 streams. |
| `backtest_receipt` | Defer | Potentially valuable, but only paper-only and reproducibility-focused after source terms and assumptions are clear. |
| `prediction_market_brief` | Defer | Keep away from execution and venue writes; salvage only public context patterns. |
| `paid_inference_chat` | Do not port | This depends on Sapphire's local inference mesh, which belongs in runtime control, not AOE. |
| `paid_embeddings` | Do not port | Same local-mesh dependency; revisit only as a generic artifact-search feature later. |

## Source Decisions

Port or keep active:

- `cisa_kev`
- `nvd_cve`
- `first_epss`
- `sec_edgar`
- `fred_alfred`
- `sam_gov_opportunities`
- `grants_gov`
- `regulations_gov`
- `data_gov_catalog`
- `census_cbp_zbp`
- `developer_docs_public`
- `github_releases`

Review before paid dependency:

- `gdelt_2`
- `defillama`
- `polymarket`
- `urlhaus`
- `databento`
- `alpaca_market_data`
- `bigquery_public`

Do not port as AOE product dependencies now:

- `local_inference_mesh`
- runtime-specific Telegram, Windows, Mac, Pi, LaunchAgent, or TradingView
  surfaces.

## Contract Gaps To Close In AOE

1. Publish JSON Schema files for product, route, source, artifact, provenance,
   and receipt contracts.
2. Add an MCP read-only resource surface for products, sources, routes,
   readiness, and artifact previews.
3. Add one MCP quote/preflight tool before any paid-content MCP tool.
4. Extend provenance events around preview, quote, preflight, unpaid denial,
   simulated/testnet paid fetch, and source refresh.
5. Add source-refresh ledger entries before claiming freshness/SLA readiness.
6. Keep all settlement code simulated/testnet until buyer terms, refunds,
   tax/accounting, KYT/sanctions, and source-rights review are complete.

## First Port Candidate

Port `agentwiki_builder_brief` into AOE as four standalone artifact families:

- `opportunity.federal_fit_brief.v1`
- `opportunity.regulatory_deadline_watch.v1`
- `opportunity.local_program_map.v1`
- `developer.api_change_radar.v1`

Each should include:

- source ids;
- retrieval timestamp or cache vintage;
- source URL;
- rights envelope;
- freshness class;
- normalized artifact hash;
- buyer caveats;
- explicit prohibited uses;
- no raw source resale;
- no paywall/auth bypass;
- no live settlement.

