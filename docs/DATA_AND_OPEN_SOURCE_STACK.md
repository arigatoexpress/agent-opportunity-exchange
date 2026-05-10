# Data and Open-Source Stack

## Core API

- Hono for the HTTP service.
- Vitest for behavior tests.
- TypeScript for explicit product/source/artifact contracts.
- x402 Foundation SDKs when moving from simulated payment challenges to real
  testnet integration.

## Source Domains

### Opportunity Intelligence

- SAM.gov opportunities.
- Grants.gov.
- Regulations.gov.
- Data.gov.
- Census ACS and County/ZIP Business Patterns.

### Separate Regional Wildfire Intelligence

This stack is outside the x402 stream catalog.

- NASA FIRMS active fire detections.
- NIFC/WFIGS incidents and perimeters.
- LANDFIRE fuels and vegetation.
- NWS alerts and fire-weather products.
- FEMA National Risk Index.
- Census and HIFLD/OpenStreetMap context.
- FAA UAS/TFR/LAANC references for drone-readiness constraints.

### Defensive Cyber

- CISA Known Exploited Vulnerabilities.
- NVD CVE API 2.0.
- FIRST EPSS.
- OSV.
- MITRE ATT&CK/D3FEND later for technique and countermeasure framing.
- Nuclei, OpenVAS/Greenbone, Prowler, Wazuh, DefectDojo later only behind
  authorization and safe import boundaries.

### Market Intelligence

- FRED and ALFRED.
- CFTC COT.
- SEC EDGAR APIs.
- DefiLlama and CoinGecko only with terms-aware output filters.
- GDELT only with source-rights safeguards for article-derived content.

### Developer Intelligence

- Public developer docs where terms permit.
- GitHub releases and repository metadata.
- Package registries.
- Official changelogs and status pages.

## Future Infrastructure

- Postgres plus pgvector for artifact search.
- Pay.sh sandbox gateway and provider specs for agent-payable API discovery,
  starting with preview endpoints and no live settlement.
- Solana x402/MPP support as a rail-registry and sandbox-integration target,
  with mainnet blocked until compliance and buyer terms are complete.
- Google Cloud data products through Cloud Run or BigQuery only after provider,
  source-rights, and billing boundaries are reviewed.
- PostGIS for the separate wildfire/regional spatial lane.
- MapLibre GL JS and deck.gl for operational 2D maps.
- CesiumJS for 3D terrain and airspace demos.
- ROS 2, PX4, Gazebo, MAVSDK only for simulation products, not real flights.
- SUMO or MATSim for evacuation/bottleneck scenarios.

## Data Contract Rule

Every adapter must produce:

- source id;
- retrieval timestamp;
- source URL;
- source vintage;
- hash of normalized record;
- rights envelope;
- freshness class;
- output policy;
- known limitations.
