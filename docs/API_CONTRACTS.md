# API Contracts

Agent Opportunity Exchange exposes buyer-readable contracts before any paid
artifact content unlocks. The contract surface is intentionally small:

- `GET /.well-known/agent-opportunity-exchange.json` advertises discovery,
  schema, readiness, and safety endpoints.
- `GET /v1/contracts` returns `aoe.contract_bundle.v1`, a buyer-facing
  OpenAPI 3.1 and JSON Schema bundle generated from the current product, route,
  readiness, x402, and source-rights registries.
- `GET /v1/buyer-proof` returns `aoe.buyer_proof.v1`, a compact public
  "why pay" proof surface with sellability score, source risk counts, live
  route posture, featured proof routes, and hard no-side-effect boundaries.
- `GET /v1/products` returns `aoe.discovery.products.v1` with product schema
  ids, quality metadata, buyer value metrics, and source freshness/SLA caveats.
- `GET /v1/routes` returns `aoe.discovery.routes.v1` with public preview,
  quote, preflight, simulated paid-content, and separate read-only lane routes.
- `GET /v1/streams` returns `aoe.streams.discovery.v1` for the current
  x402-shaped live streams, including any explicit historical-claims posture.
- `GET /v1/readiness` returns `aoe.readiness.v1` with adapter status and
  contract coverage checks.
- `GET /v1/x402/status` returns `aoe.x402.status.v1` with payment mode,
  Base Sepolia readiness, facilitator URL, redacted pay-to address, and
  no-mainnet safety posture.
- `GET /v1/telegram/status` returns `aoe.telegram.status.v1` with Telegram
  Mini App registration posture, BotFather setup hints, and no-send/no-webhook
  boundaries.
- `POST /v1/access/preflight` returns `aoe.access.preflight.v1`-shaped access
  decisions with the buyer-visible product contract when the product exists.
- `POST /v1/telegram/register` returns `aoe.telegram.registration.v1` after
  server-side `Telegram.WebApp.initData` validation. Without
  `AOE_TELEGRAM_BOT_TOKEN`, it fails closed.
- `POST /v1/adapters/cyber/inventory-priority/preview` returns
  `sapphirealpha.cyber_inventory_priority.preview.v1` for authorized buyer JSON
  inventories. It maps submitted CVEs/assets to live KEV/EPSS/NVD defensive
  priority evidence without scans, exploit content, or credential material.
- `POST /v1/adapters/cyber/inventory-priority/report` returns
  `aoe.adapter.cyber_inventory_priority.report.v1`, wrapping the same
  authorized-inventory evidence with a derived `text/html` proof packet for
  buyer review. The HTML is generated from source-linked metadata and must not
  contain exploit instructions, credentials, scans, or raw source resale.
- `POST /v1/streams/cyber-expert-harness/blueprint` returns
  `aoe.cyber_expert_harness.blueprint.v1`, a read-only MDASH-inspired defensive
  expert-agent architecture contract. It describes harness stages, agent roles,
  local GPU posture, RAG/fine-tune boundaries, and proof policies without
  running scans or generating exploit payloads.
- `POST /v1/streams/cyber-expert/case-store` returns
  `aoe.cyber_expert_case_store.preview.v1`, a read-only case-store preview that
  turns authorized inventory, CVEs, crypto incident metadata, proof
  commitments, and private note hashes into source-linked RAG records. It does
  not fetch live sources, call TRM/OFAC, echo hostnames, echo raw wallet
  addresses, expose notes, or include vendor payloads.
- `POST /v1/streams/cyber-expert/model-preview` returns
  `aoe.cyber_expert_model_preview.v1`, a deterministic no-provider-call preview
  of the future local/API model response. It consumes the same input as the
  case-store route, builds the case-store packet internally, and returns an
  executive summary, priority queue, source coverage, human-review queue,
  blocked actions, and explicit `modelCallsMade=0` / `localGpuUsed=false` /
  `paidApiUsed=false` posture.
- `POST /v1/streams/cyber-expert/case-brief` returns
  `aoe.cyber_expert_case_brief.v1`, the preferred operator-facing cyber brief.
  It composes the deterministic model-preview contract, optional public CVE
  freshness, optional local Windows/Ollama advisory output, and a human-review
  decision block. Public refresh receives CVE identifiers only. Local model
  output is optional, hash-gated, and non-authoritative. Deterministic-only
  requests can run as a public preview with `includePublicCveRefresh=false` and
  `includeLocalModel=false`; public source refresh and local-model advisory
  lanes require the route's simulated x402 access header.
- `POST /v1/streams/cyber-expert/case-brief/report` returns
  `aoe.cyber_expert_case_brief.report.v1`, an escaped buyer-safe `text/html`
  report wrapper around the same case brief. Deterministic-only reports remain
  public; public CVE refresh and local-model advisory reports require the same
  simulated x402 route access as the JSON brief.
- `POST /v1/compliance/screening/decision-preview` returns
  `aoe.compliance_decision_preview.v1`, a commitment-only public proof preview
  for private TRM/OFAC-style screening decisions. It accepts commitments,
  source roots, policy versions, decision posture, and expiry metadata only. It
  rejects raw wallet addresses, performs no live TRM/OFAC call, posts no
  on-chain proof, and does not claim sanctions clearance.
- `GET /v1/hackathon/0g-proof` returns
  `aoe.zero_g_proof_readiness.v1`, a judge-facing 0G proof passport. It reads
  only the existing public 0guard 0G anchor transaction receipt, then returns
  chain id, contract address, anchor transaction, public proof URLs, receipt
  status, source hashes, and safety flags. It performs no wallet signing,
  transaction broadcast, 0G node start, proof posting, live settlement, private
  screening, or sanctions-clearance claim.
- `GET /v1/streams/cyber-expert/evals` returns
  `aoe.cyber_expert_eval_report.v1`, a public read-only deterministic eval
  report for the cyber expert model-preview contract. It runs no model, GPU,
  paid API, TRM/OFAC, or scan calls.
- `GET /v1/streams/cyber-expert/provider-status` returns
  `aoe.cyber_expert_provider_status.v1`, a public read-only provider-gate
  status. It reports the resolved provider id, requested provider id, blocked
  status, and gate reasons without echoing environment variable values or
  calling providers.
- `GET /v1/streams/cyber-expert/windows-ollama/status` returns
  `aoe.cyber_windows_ollama_status.v1`, a read-only Windows/Ollama status
  report. When `AOE_WINDOWS_OLLAMA_URL` is configured it calls `/api/tags`
  only, hashes the endpoint and model names, and never calls `/api/chat`,
  `/api/generate`, or embeddings endpoints.
- `POST /v1/streams/cyber-expert/windows-ollama/preview` returns
  `aoe.cyber_ollama_model_preview.v1`, a gated local Windows/Ollama preview
  over the deterministic cyber expert case contract. It fails closed unless
  `AOE_CYBER_MODEL_PROVIDER=windows_ollama_capped_worker`,
  `AOE_CYBER_MODEL_PROVIDER_ENABLED=true`,
  `AOE_CYBER_MODEL_EVAL_SUITE_HASH` matches the current deterministic eval
  suite hash,
  `AOE_CYBER_MODEL_CHAT_ALLOWED=true`, `AOE_WINDOWS_OLLAMA_URL`, and
  `AOE_CYBER_MODEL_NAME` are all set. When enabled, it checks `/api/tags`,
  calls `/api/chat` once with `stream=false`, `think=false`, `temperature=0`,
  structured JSON format, and `keep_alive=0` by default, and never echoes raw
  prompts, raw model output, endpoint URLs, model names, hostnames, wallets,
  secrets, private notes, or vendor payloads. The route also requires simulated
  x402 access before evaluating live local-model gates.
- `POST /v1/streams/cyber-expert/public-cve-refresh` returns
  `aoe.cyber_public_cve_refresh.v1`, a read-only public CVE refresh report. It
  queries CISA KEV, FIRST EPSS, NVD, and OSV by CVE identifier only, never
  sends buyer inventory, hostnames, notes, secrets, wallets, or customer
  identifiers, reports cache status and per-source duration, caps batches at 50
  normalized CVEs, and labels partial source failures as degraded instead of
  inventing missing facts.
- `POST /v1/adapters/opportunities/public-programs/preview` returns
  `aoe.adapter.opportunity_public_programs.preview.v1` for a no-secret
  opportunity-discovery preview. It searches unauthenticated Grants.gov
  opportunity metadata and Data.gov Catalog metadata, marks SAM.gov as
  key-required, and returns derived fit signals and source links without raw
  package resale or eligibility claims.

## Product Metadata

Every sellable product must include:

- `schemaId`, for example `aoe.product.cyber_exploited_vuln_priority.v1`;
- `contractVersion`;
- `quality.qualityTier`;
- `quality.buyerValueMetrics`;
- `quality.sourceFreshnessSla`;
- `quality.auditSignals`;
- rights, source ids, disclaimers, and explicit no-live-settlement posture.

## Contract Bundle

`GET /v1/contracts` is the integration handoff for buyers, agents, and future
frontends. It includes:

- `pathContracts`: route ids, paths, methods, schema ids, source ids, product or
  workstream ids, access mode, readiness, caveats, and disabled side-effect
  flags;
- `schemaCatalog["aoe.streams.discovery.v1"]`: typed stream discovery with
  route, source ids, settlement posture, and optional historical-claims policy
  such as `productionHistoricalClaimsRequire: "alfred_vintages"`;
- `schemaCatalog`: reusable JSON Schemas keyed by existing schema ids;
- `openapi`: an OpenAPI 3.1 document with `x-aoe` extensions that repeat the
  route-level access, readiness, x402, source, and safety posture;
- `paymentBoundary`: simulated-header default, Base Sepolia x402 testnet only
  when explicitly configured, `mainnetAllowed=false`, and
  `liveSettlementAllowed=false`;
- `rightsBoundary`: the payment-is-not-permission rule, source count/risk
  summary, and prohibited use classes such as raw source resale, paywall bypass,
  credential material, unauthorized scans, trading, and money movement.

`quality.sourceFreshnessSla` is not a guarantee that upstream public data is
always reachable. It is the buyer-facing expectation and caveat envelope for
how current a paid artifact may claim to be. If a route falls back to partial
or degraded data, the response must say so plainly.

## Route Metadata

Route discovery entries include:

- `routeId`;
- `route` and `method`;
- route-level `schemaId`;
- `access` as `public` or `simulated_x402_payment`. The paid-content route is
  simulated by default and can be official x402 testnet only when
  `AOE_PAYMENT_MODE=x402_testnet` and `AOE_X402_PAY_TO` are configured;
- `readiness`;
- product/workstream ids;
- source ids;
- buyer-facing value and caveats.

Wildfire and drone-readiness routes can appear in route discovery only as
`x402Stream: false` separate read-only lanes. They are not paid x402 products.

Telegram routes can appear only as opt-in distribution and registration
surfaces. They must keep `outboundTelegramSendsAllowed=false`, avoid webhook
registration by default, and must not claim chat-reading, production sends, or
official Mira API integration.

Opportunity public-program routes are paid-stream previews, but they must keep
the source-rights boundary visible: Grants.gov and Data.gov results are
metadata and source-link discovery, SAM.gov is key-required until explicitly
configured, and the output is not a legal eligibility determination or an
official agency endorsement.

For the market live-proof stream specifically, discovery should make the
historical-claims boundary visible before runtime: the current live macro read
mode is FRED graph CSV, `revisionAware=false`, and resale of historical or
revision-sensitive macro claims requires explicit ALFRED vintages.
The exported schema should also make freshness and provenance fail closed with
explicit `generatedAt`, `durationMs`, `sourceEvidence`, and
`reportSummary.evidenceProof` fields.

For the 0G proof passport specifically, discovery should make the proof/read
boundary visible before runtime: the route is `GET` only, `sideEffects` is
`public_chain_receipt_fetch_only`, the current proof source is 0guard's public
hackathon anchor, and the product must keep `walletSigningAllowed=false`,
`transactionBroadcastAllowed=false`, `proofPostingAllowed=false`,
`nodeStartAttempted=false`, and `rawComplianceSubjectPublished=false`.

## Current Contract Gaps

- Source freshness is declared in the registry; no scheduled refresh ledger
  proves ongoing SLA attainment yet.
- Mainnet/live settlement is deliberately absent. The payment surface is
  simulated or Base Sepolia testnet only until compliance, refunds,
  KYT/sanctions, tax/accounting, buyer terms, and source-rights review are
  complete.
