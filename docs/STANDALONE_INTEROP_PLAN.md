# Standalone Interop Plan

This repo stays the x402 product kernel. Other projects should integrate with
it through contracts instead of copying its runtime code or pulling it back
into Sapphire.

## Default Stack

- Hono and TypeScript for the public API.
- Official x402 SDKs for testnet/live payment protocol work.
- Zod and TypeScript contracts for route/product/source schemas.
- Vitest for behavior and safety-boundary tests.
- Append-only provenance and receipt ledgers.
- MCP TypeScript SDK for agent-facing resources and narrow quote/preflight
  tools.
- Mastra later for TypeScript-native packaging, workflows, evals, and MCP
  exposure once deterministic adapters are boring.
- OpenAI Agents SDK later when server-owned approvals, tracing, guardrails, and
  handoffs become central.
- Inngest or Trigger.dev for scheduled source refresh before considering
  Temporal.

## Project Boundaries

| Project | Relationship to this repo | Boundary |
| --- | --- | --- |
| `agent-runtime-control-plane` | Owns local-machine, Telegram, Hermes, LaunchAgent, Windows, Pi, and operator-control migration. | Must not become a paid data product or store source payloads from this repo. |
| `Sapphire` | Reference source for x402/AgentWiki contracts, public/admin boundary, and safety posture. | Do not make Sapphire the new product home. Salvage through explicit docs/tests only. |
| `sapphire-sentinel` | Standalone hackathon/demo consumer of x402 and MCP contracts. | Should consume quote/preflight/artifact contracts rather than importing Sapphire internals. |
| `megaeth-agent-guard` | Standalone guardrail demo that can use product metadata and paid access contracts. | Keep chain/hackathon code isolated from AOE settlement and receipts. |
| `wildfire-watch` | Separate public-safety/read-only domain repo. | Not an x402 stream catalog unless a future licensed data product is explicitly designed. |
| `cyber-threat-bot` | Defensive source and workflow reference for cyber priority packs. | No exploit payloads, unauthorized scans, or offensive enrichment. |
| `regional-intel-workbench` | Source-pattern reference for opportunity and regional intelligence. | Runtime/Pi deployment assumptions migrate to the runtime control plane. |
| `Project-Go-Forward` | No default integration. | THO stays protected and separate unless Ari explicitly opens that scope. |

## Interop Contract

Standalone projects should integrate through:

- `GET /.well-known/agent-opportunity-exchange.json`
- `GET /v1/products`
- `GET /v1/routes`
- `GET /v1/sources`
- `GET /v1/readiness`
- `POST /v1/access/preflight`
- artifact preview, quote, and content routes;
- future MCP resources for products, sources, artifacts, and provenance;
- future MCP tools for quote and preflight only.

They should not integrate through:

- shared `.env` files;
- copied payment middleware;
- local LaunchAgent assumptions;
- Telegram command paths;
- direct access to receipt ledgers;
- Sapphire dashboard routes as product dependencies.

## First Migration Slices

1. Add a source-level salvage map from Sapphire x402/AgentWiki configs into AOE
   product/source/artifact contracts.
2. Add MCP read-only resources for product, source, route, and readiness
   discovery.
3. Add a single quote/preflight MCP tool with simulated/testnet posture only.
4. Convert `sapphire-sentinel` into an external x402/MCP consumer demo.
5. Move any local runtime or Telegram assumptions found during integration to
   `agent-runtime-control-plane`, not into this repo.

## Cutover Gate

No project should claim it is integrated with AOE until it can pass:

- public discovery readback;
- quote or preflight call;
- unpaid content denial;
- simulated/testnet paid content readback;
- provenance/receipt reference;
- source-rights caveat display;
- no live settlement;
- no live Telegram sends;
- no trading or money movement.

