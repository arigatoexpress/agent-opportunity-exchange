# Market Intelligence Synthesis

Date: 2026-05-08 MDT

This is the research spine used for the initial product registry.

## Conclusion

The highest-value first project is a paid intelligence broker, not a new
proprietary operating system. The market wants bounded, sourced, current answers
that can be purchased by agents and humans without onboarding friction.

The first wedge should be:

1. exploited-vulnerability priority packs for MSP/SMB buyers;
2. regional wildfire intelligence and grant-ready evidence packs;
3. opportunity-intelligence packs for grants, RFPs, programs, and regulatory
   deadlines;
4. market-regime and filings evidence packs with no investment advice;
5. developer API-change radar.

## x402

x402 enables HTTP-native pay-per-request APIs and content through `402 Payment
Required`, facilitator verification, and agent-friendly purchase flows. The
repo should use the open x402 SDK when moving beyond the current simulated
challenge.

Near-term use: per-artifact purchase with source rights and receipts.

Do not use x402 as permission laundering. Payment does not grant copyright,
database, API, privacy, or anti-circumvention rights.

Primary references:

- https://docs.cdp.coinbase.com/x402/docs/facilitator
- https://github.com/x402-foundation/x402
- https://developers.cloudflare.com/agents/x402/
- https://blog.cloudflare.com/x402/

## Wildfire / Regional

Best wedge: regional wildfire intelligence desk and grant-ready evidence packs
before drone operations. Public datasets are strong, fragmented, and valuable
when fused:

- NASA FIRMS;
- NIFC/WFIGS;
- LANDFIRE;
- NWS alerts and fire-weather data;
- FEMA National Risk Index;
- Census/ACS;
- FAA UAS, TFR, LAANC constraints.

Revenue should start with planning, situational awareness, tabletop exercises,
grant packs, and drone-readiness simulation.

Primary references:

- https://www.wildfire.gov/page/data-management-data-sources
- https://www.nesdis.noaa.gov/data-products-research-services/wildland-fire-data-portal
- https://landfire.gov/
- https://www.faa.gov/uas/public_safety_gov/drone_program
- https://www.fs.usda.gov/science-technology/fire/unmanned-aircraft-systems/faqs

## Cyber

Best wedge: “what should I fix today and why?” for MSPs, SMBs, and cyber
insurance evidence. Use public defensive data:

- CISA KEV;
- NVD CVE API 2.0;
- FIRST EPSS;
- OSV;
- later MITRE ATT&CK/D3FEND and authorized scanner imports.

Do not provide exploit payloads, credentials, or unauthorized scanning.

Primary references:

- https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- https://nvd.nist.gov/developers/vulnerabilities
- https://api.first.org/epss/
- https://osv.dev/

## Markets

Best wedge: paid evidence packs, not automated trading. Sell macro regimes,
filing changes, onchain market-structure snapshots, and reproducible backtest
receipts with strong disclaimers.

Useful sources:

- FRED/ALFRED;
- CFTC COT;
- SEC EDGAR APIs;
- DefiLlama/CoinGecko with terms-aware output filters;
- GDELT for narrative/event metadata with source-rights caution.

Primary references:

- https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- https://www.cftc.gov/MarketReports/index.htm
- https://docs.messari.io/api-reference/x402-payments

## Open-Source Stack

Use existing high-quality projects:

- Hono for the API;
- x402 SDKs for payment middleware when ready;
- Vitest/TypeScript for tests and contracts;
- Postgres/PostGIS/pgvector later;
- MapLibre/deck.gl/Cesium later;
- Nuclei/OpenVAS/Prowler/Wazuh only behind authorization and defensive import
  boundaries;
- ROS 2/PX4/Gazebo only for simulation.
