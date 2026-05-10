# Safety Boundaries

## Standing Defaults

- `liveSettlementAllowed=false`
- `externalSideEffectsAllowed=false`
- simulated/testnet x402 only
- no raw secret output
- no live trading
- no real Telegram or customer sends
- no unauthorized scans
- no drone operations
- no production infrastructure mutation

## Payment Boundary

x402 is only for market and relevant-data streams in this repo. It is not the
payment surface for wildfire/drone work. It also does not grant copyright,
database, contract, privacy, API, or anti-circumvention rights.

Before live settlement:

- settlement network and facilitator must be selected and reviewed beyond the
  current Base Sepolia-only testnet gate;
- mainnet network ids must remain blocked until a separate launch review;
- server deployments must never store buyer private keys;
- sanctions/KYT and abuse handling must be documented;
- refund and dispute policy must exist;
- receipts and tax/accounting export must exist;
- buyer terms must describe output rights;
- source registry must mark every artifact as green/yellow/red.

## Cyber Boundary

Allowed:

- vulnerability prioritization;
- buyer-provided inventory evidence for authorized assets;
- KEV/EPSS/NVD/OSV enrichment;
- defensive remediation checklists;
- evidence packets for authorized systems;
- NIST/PCI-style mapping.

Not allowed:

- exploit payloads or exploit instructions;
- stolen credentials, stealer logs, or dumps;
- unauthorized scanning;
- bypass, persistence, malware, evasion, or weaponized recon;
- dark-web resale framing.

## Market Boundary

Allowed:

- impersonal research;
- macro, filings, COT, onchain, and narrative evidence packs;
- reproducible paper-only backtest receipts;
- methodology, caveats, fees, slippage, and data-quality warnings.

Not allowed:

- personalized portfolio advice;
- buy/sell/hold or target-price recommendations;
- live trade execution;
- order signing or broker writes;
- performance claims without hypothetical-performance disclosure.

## Wildfire / Drone Boundary

Wildfire and drone-readiness are a separate operational research lane, not an
x402 stream catalog.

Allowed:

- public-source regional intelligence;
- WUI, fuels, weather, and exposure summaries;
- simulated coverage and drone-readiness checks;
- grant-ready evidence;
- airspace/TFR/LAANC caveats and SOP checklists.

Not allowed:

- claiming incident-command authority;
- real flights or autonomous patrols;
- BVLOS operations;
- flying inside TFRs or restricted airspace;
- replacing official emergency alerts.

## Source Rights Boundary

Green sources can be used for derived facts with citation.

Yellow sources require terms review, licensing, rate-limit review, and output
filters before paid redistribution.

Red sources are blocked until separately licensed or explicitly authorized.

Never use paywall bypass, CAPTCHA bypass, residential-proxy evasion, token
replay, stealth browser circumvention, or auth-gated scraping as a product path.
