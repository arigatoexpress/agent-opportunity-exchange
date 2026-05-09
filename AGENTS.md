# Agent Opportunity Exchange Agent Charter

This repo is separate from Sapphire and must stay separate.

## Mission

Build a rights-cleared paid intelligence product for agents, builders, operators,
and small teams. The repo should stay small, source-grounded, testable, and
commercially legible.

The initial product is an x402-ready artifact broker:

- public previews;
- paid full artifacts;
- source-rights registry;
- quote and preflight checks;
- simulated/testnet receipts;
- no live settlement until compliance is ready.

## Hard Boundaries

- Do not touch `/Users/aribs/Code/Project-Go-Forward` or any THO/TexasHomeOutlet
  repo, worktree, deploy surface, docs, or runtime.
- Do not mutate `/Users/aribs/Code/Sapphire` from this repo. Read-only reference
  is allowed when Ari explicitly asks for spinout context.
- No live trading, order signing, portfolio-personalized advice, or money
  movement.
- No production Telegram sends.
- No external vulnerability scans without explicit proof of authorization.
- No exploit payloads, credential dumps, paywall bypass, anti-bot evasion, or
  raw source resale.
- Keep x402 in simulated/testnet mode until settlement, KYT/sanctions, refunds,
  tax/accounting, source rights, and buyer terms are reviewed.

## Implementation Rules

- Prefer Hono/TypeScript for the API kernel and explicit typed registries.
- Add tests for every product boundary that matters.
- Treat public data as a rights question, not a free-for-all.
- Sell derived analysis, source links, metadata, provenance, freshness, and
  action checklists.
- Keep outputs short enough for agents to buy and consume directly.

## Product Taste

Use the best open-source frameworks where they make the system cleaner:
Hono for the HTTP service, x402 SDKs when live/testnet payment integration is
ready, Postgres/PostGIS later for spatial work, MapLibre/Cesium later for maps,
and focused source adapters rather than a monolithic scraper.

If a feature starts looking like old Sapphire sprawl, stop and reduce it to a
registry entry, one endpoint, one tested behavior, or a doc-backed backlog item.
