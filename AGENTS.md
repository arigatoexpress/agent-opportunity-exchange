# Agent Opportunity Exchange — Agent Guidelines

## What this repo does

x402-ready paid intelligence marketplace for agents, builders, and operators. It brokers rights-cleared data streams (cyber, market, opportunity programs) with public previews, quotes, simulated receipts, and strict safety gates.

## Key directories and files

| Path | Purpose |
|------|---------|
| `src/server.ts` | Entrypoint |
| `src/app.ts` | Hono app, route wiring, x402 middleware |
| `src/catalog.ts` | Product catalog and artifact registry |
| `src/contracts.ts` | Typed contracts and buyer-facing schemas |
| `src/readiness.ts` | Product and route readiness checks |
| `src/preview-safety.ts` | Preview verification gates |
| `src/payments.ts` | x402 payment middleware and receipt handling |
| `src/adapters/` | Source adapters: cyber, market, wildfire, opportunity |
| `src/cli/` | CLI tools (e.g., `cyber-priority.ts`) |
| `src/mcp/` | MCP servers (e.g., crypto-research) |
| `src/telegram.ts` | Telegram Mini App registration surface |
| `tests/` | Vitest tests |
| `scripts/` | Helper scripts: burner wallet, testnet fetch, sellability, market smoke |

## How to run tests / dev server

```bash
npm run dev              # tsx watch src/server.ts
npm run verify           # boundary check + typecheck + tests
npm test                 # vitest run
npm run typecheck        # tsc --noEmit
npm run build            # compile to dist/
npm run browser:smoke    # Playwright smoke tests
npm run boundary         # check-boundaries.mjs
```

## Safety boundaries

- Do not touch `/Users/aribs/Code/Project-Go-Forward` or any THO/TexasHomeOutlet repo, worktree, deploy surface, docs, or runtime.
- Do not mutate `/Users/aribs/Code/Sapphire` from this repo. Read-only reference is allowed when Ari explicitly asks for spinout context.
- No live trading, order signing, portfolio-personalized advice, or money movement.
- No production Telegram sends.
- No external vulnerability scans without explicit proof of authorization.
- No exploit payloads, credential dumps, paywall bypass, anti-bot evasion, or raw source resale.
- Keep x402 in simulated/testnet mode until settlement, KYT/sanctions, refunds, tax/accounting, source rights, and buyer terms are reviewed.

## Implementation rules

- Prefer Hono/TypeScript for the API kernel and explicit typed registries.
- Add tests for every product boundary that matters.
- Treat public data as a rights question, not a free-for-all.
- Sell derived analysis, source links, metadata, provenance, freshness, and action checklists.
- Keep outputs short enough for agents to buy and consume directly.

## Current status

Active product development. Core x402 flow, cyber adapter, market stream, and preview safety are tested. Wildfire and opportunity adapters are read-only research lanes, not x402 streams.
