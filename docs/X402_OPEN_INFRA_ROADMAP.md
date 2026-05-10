# x402 Open Infrastructure Roadmap

## Thesis

Agent Opportunity Exchange should become a small open-source toolkit for
rights-cleared paid data products: source adapters, product contracts, quotes,
preflight checks, receipts, and payment-rail discovery that agents can inspect
before spending.

The current repo already supports simulated x402-style access and official Base
Sepolia x402 testnet middleware. The next rail to explore is Pay.sh/Solana, but
only through sandbox and provider-spec work until live settlement review is
complete.

## Current Source Truth

- Solana Foundation announced Pay.sh in collaboration with Google Cloud as a
  gateway for agent access to APIs, including Google Cloud APIs, using
  stablecoins on Solana.
- Pay.sh docs describe sandbox-first client and server workflows for HTTP 402
  payment challenges, with explicit local authorization before real payments.
- x402 docs list CAIP-2 identifiers and token support across EVM, Solana, and
  other ecosystems; Solana support uses SPL or Token-2022 style assets.

Source records are captured in `/v1/sources` as `pay_sh_docs`,
`solana_pay_sh_launch`, `solana_foundation_pay_github`, `x402_docs_networks`,
and `x402_docs_faq`.

## Modular Toolkit

1. Rail registry:
   - `GET /v1/payment-rails`;
   - active simulated/Base Sepolia posture;
   - Pay.sh/Solana sandbox and blocked-mainnet records;
   - no private keys, no mainnet, no live spend.

2. Rights registry:
   - source owner, source URL, access mode, rights envelope, risk, caveats;
   - green/yellow/red source posture;
   - paid outputs limited to derived analysis, metadata, provenance, freshness,
     checklists, and source links.

3. Quote and preflight middleware:
   - price cap;
   - source allow-list;
   - side-effect posture;
   - settlement mode;
   - buyer-visible product contract before paid access.

4. Receipt and provenance ledger:
   - work order id;
   - artifact hash;
   - non-secret settlement metadata;
   - source ids;
   - delivery hash and audit caveats.

5. Pay.sh sandbox adapter:
   - start with a public preview endpoint;
   - publish gateway URLs, not upstream provider URLs;
   - keep paid-content unlock on existing simulated/Base Sepolia rail;
   - add a provider spec only after the route contract is stable.

6. Data-engineering spine:
   - source adapters that normalize records with hashes and retrieval metadata;
   - source-health jobs and drift warnings;
   - Postgres/pgvector for catalog search;
   - future BigQuery or Cloud Run provider surfaces only after rights and billing
     review.

7. MCP surface:
   - `aoe_quote`;
   - `aoe_preflight`;
   - `aoe_payment_rails`;
   - `aoe_receipt_lookup`;
   - no paid fetch MCP tool until settlement and buyer terms are reviewed.

## Safety Gates

Live settlement stays blocked until all of these exist:

- KYT/sanctions and abuse handling;
- refund and dispute workflow;
- tax/accounting export;
- buyer terms and output-rights language;
- source-license review for every paid artifact;
- deployment and secret-management review;
- explicit human approval for any mainnet mode.

## Near-Term Build Order

1. Keep `/v1/payment-rails` as the source of truth for rail discovery.
2. Add a Pay.sh sandbox provider-spec draft for one preview endpoint.
3. Add a CLI smoke that validates the provider spec without spending funds.
4. Add MCP descriptors for rail discovery, quote, and preflight.
5. Only then evaluate a real sandbox gateway demo.

