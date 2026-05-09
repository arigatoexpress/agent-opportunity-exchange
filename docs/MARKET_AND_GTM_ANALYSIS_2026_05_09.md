# Market And GTM Analysis

Date: 2026-05-09

This brief turns the current testing pass into a commercial decision. It should
be refreshed before public launch pricing changes or live settlement work.

## Recommendation

Sell **Exploited Vulnerability Priority Pack** first, then use the live
SEC/FRED stream as the proof-heavy market-intelligence demo.

The cyber pack has the clearest urgent buyer pain: MSPs, fractional IT teams,
SMB security operators, and cyber-insurance support teams need a short,
defensible answer to "what should I fix today and why?" They are not buying raw
CVEs. They are buying prioritization, source proof, remediation context, and a
client-ready packet.

The market stream is still valuable, but it must be marketed as non-advisory
research context and separated into two tiers:

- green-source SEC/FRED/CFTC evidence streams;
- licensed/vendor/onchain/narrative streams after source-specific terms review.

## Buyer Segments

| Segment | First paid job | Why this repo can win |
| --- | --- | --- |
| MSPs and SMB security teams | Rank a CVE/software inventory into a fix-now queue | CISA KEV, FIRST EPSS, NVD, and OSV can be fused into a concise defensive packet |
| Fractional CISOs and cyber insurers | Produce evidence for remediation, renewal, or board reporting | Source links, caveats, and no-offense guardrails make it easier to trust |
| Analysts and market research agents | Get SEC filing context plus macro series in one cited payload | The buyer sees schema, sources, caveats, and preview before paying |
| Grant writers and small GovCon teams | Get fit-scored opportunity briefs | Public opportunity sources are fragmented and time-sensitive |
| Agent builders and DevRel teams | Track API/docs drift before generated code breaks | Public docs and release metadata can become short, tested diff artifacts |

## Market Evidence

- x402 is a credible distribution rail for agent-consumable APIs: Coinbase
  describes x402 as HTTP-native programmatic payment for API services, AI
  agents, digital content, and microservices, with SDK support and facilitator
  settlement infrastructure.
- Public data is not the product. Nasdaq Data Link explicitly distinguishes
  free/open datasets from premium datasets and positions professional use around
  API access, samples, tools, and curated data. The value is curation,
  normalization, distribution, and trust.
- SEC EDGAR is a strong market source, but it has a fair-access ceiling and user
  agent expectations. The product must cache, degrade honestly, and avoid
  pretending live SEC access is always available.
- FRED/ALFRED is useful for macro context, but its terms put responsibility on
  the application to respect underlying third-party data-series rights. Market
  packs need source-level rights handling.
- Cyber has the strongest immediate wedge because CISA KEV, FIRST EPSS, NVD,
  and OSV are machine-readable and directly map to a costly operational
  question. FIRST describes EPSS as estimating the probability a CVE will be
  exploited in the next 30 days, and the EPSS API supports CVE lookup, batch
  lookup, historical queries, and high-score filtering.

## Competitive Read

| Category | Incumbent pattern | Avoid competing on | Compete on |
| --- | --- | --- | --- |
| Cyber VM platforms | Tenable, Rapid7, VulnCheck-style platforms and feeds | Full scanner/platform replacement | Per-client fix-now packets, proof, PDF/JSON output, MSP workflows |
| Gov/opportunity intel | GovWin, GovSpend, HigherGov-style databases | Full CRM/procurement terminal | One opportunity or buyer-profile brief with deadlines and fit rationale |
| Market data APIs | Massive/Polygon, Alpha Vantage, Nasdaq Data Link, terminals | Raw quote feed, terminal UX, investment advice | Cited SEC/macro/filing evidence packet with caveats and reproducible receipt |
| Agent payment rails | x402 SDKs/facilitators, Cloudflare/agent payment examples | Selling the protocol itself | Selling useful packets that happen to be easy for agents to buy |

## Pricing Tests

| Product | Initial test price | Notes |
| --- | ---: | --- |
| Cyber CVE Priority Pack | $5-$50 per batch | Batch size, source freshness, and HTML/PDF export determine ceiling |
| MSP weekly client pack | $99-$499/month | Only after recurring job, auth/import boundary, and reporting stabilize |
| SEC/FRED Evidence Pack | $5-$25 per report | Research-only, no portfolio personalization, no advice |
| Opportunity Intel Brief | $10-$75 per opportunity | Best after SAM/Grants official API/key path is live |
| API Change Radar | $0.25-$5 per diff | Needs tested snippets and source terms per vendor |

## What The Data Must Prove Before Marketing

Use `npx tsx scripts/market-stream-quality.ts --json` for the active market
stream. A market stream is not marketing-ready unless these are all true:

- stream/product linkage passes;
- generated timestamp and source freshness are present;
- SEC and FRED source links are complete;
- rights envelopes prohibit raw resale and require attribution;
- response includes value-added highlights, not just raw rows;
- output contains no advice-shaped or execution-shaped fields;
- SEC degraded mode returns a clearly partial macro preview.

Use `buildSellabilityReport()` for product-level scoring. Market only products
with zero critical issues. Warnings are acceptable only when the frontend and
sales copy explicitly label them, for example "license review needed before raw
vendor/onchain data redistribution."

## Near-Term Launch Slice

1. Finish the cyber pack as the first paid artifact path:
   - input: CVE list, SBOM, or simple software inventory;
   - output: ranked remediation packet with KEV/EPSS/NVD/OSV evidence;
   - export: JSON plus HTML/PDF-ready report;
   - guardrails: no scanning, no exploit payloads, no credentials.
2. Keep the SEC/FRED live stream as a public trust demo:
   - show preview, schema, source owners, route, price, and caveats;
   - add live latency/freshness probes before public launch;
   - add normalized record hashes.
3. Split market products into:
   - `market_sec_macro_evidence_pack` for green-source sellability;
   - future `market_vendor_onchain_evidence_pack` after licensing review.
4. Add a public "why this is worth paying for" page backed by current counts:
   - source count;
   - live adapter count;
   - quality harness status;
   - product sellability score;
   - latest live preview timestamp.

## Sources

- Coinbase x402 docs: https://docs.cdp.coinbase.com/x402/welcome
- x402 public site: https://www.x402.org
- SEC EDGAR access policy: https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data
- SEC developer resources: https://www.sec.gov/about/developer-resources
- FRED API terms: https://fred.stlouisfed.org/docs/api/terms_of_use.html
- FRED API overview: https://fred.stlouisfed.org/docs/api/fred/overview.html
- Nasdaq Data Link getting started: https://docs.data.nasdaq.com/docs/getting-started
- CISA KEV catalog: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- CISA KEV JSON: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
- FIRST EPSS: https://www.first.org/epss/
- FIRST EPSS API: https://www.first.org/epss/api
- Alpha Vantage premium pricing: https://www.alphavantage.co/premium/
- Massive/Polygon pricing: https://massive.com/pricing
