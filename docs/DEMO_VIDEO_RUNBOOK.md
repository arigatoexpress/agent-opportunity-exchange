# Demo Video Runbook

Purpose: record a concise demo of Agent Opportunity Exchange as a Hono/TypeScript
x402-style paid intelligence broker. The demo should show rights-cleared
derived intelligence, live read-only public-source adapters, explicit provenance,
and simulated/testnet payment boundaries.

## One-Line Positioning

Agent Opportunity Exchange lets agents and operators discover, quote, preflight,
and buy source-cited intelligence packets over an x402-shaped API without raw
source resale, live settlement, trading, scanning, Telegram sends, or drone
action.

## Local Setup

```bash
cd /Users/aribs/Code/agent-opportunity-exchange
npm ci
cp .env.example .env.local
AOE_PAYMENT_MODE=simulated AOE_PORT=4402 npm run dev
```

Use this base URL in a second terminal:

```bash
export AOE_BASE_URL=http://127.0.0.1:4402
```

## Production-Style Commands

Use these for a production build or deployed smoke. Keep payment mode simulated
unless the explicit Base Sepolia testnet runbook is being demonstrated.

```bash
cd /Users/aribs/Code/agent-opportunity-exchange
npm run build
AOE_PAYMENT_MODE=simulated AOE_PORT=4402 npm start
```

For a deployed host:

```bash
export AOE_BASE_URL=https://agent-opportunity-exchange-trgi34bxuq-uc.a.run.app
curl -fsS "$AOE_BASE_URL/health" | jq .
curl -fsS "$AOE_BASE_URL/v1/x402/status" | jq .
curl -fsS "$AOE_BASE_URL/v1/readiness" | jq '.counts, .contracts.buyerDiscoveryReady'
```

Do not claim a host is live unless those commands return the expected AOE
schemas and `liveSettlementAllowed: false`.

## Endpoints To Show

```bash
curl -fsS "$AOE_BASE_URL/health" | jq .
curl -fsS "$AOE_BASE_URL/.well-known/agent-opportunity-exchange.json" | jq .
curl -fsS "$AOE_BASE_URL/v1/contracts" | jq '.schemaId, .paymentBoundary, .rightsBoundary'
curl -fsS "$AOE_BASE_URL/v1/products" | jq '.products[] | {productId,title,priceUsd,settlementMode,liveSettlementAllowed,sourceIds}'
curl -fsS "$AOE_BASE_URL/v1/routes" | jq '.routes[] | {routeId,method,route,access,x402Stream,readiness}'
curl -fsS "$AOE_BASE_URL/v1/sources" | jq '.sources[] | {sourceId,name,url,retrievalMode,rights}'
curl -fsS "$AOE_BASE_URL/v1/x402/status" | jq .
```

Show the featured live upstream proof:

```bash
curl -fsS -X POST "$AOE_BASE_URL/v1/streams/market-context/live-proof" \
  -H 'content-type: application/json' \
  -d '{"ticker":"AAPL","seriesIds":["FEDFUNDS","UNRATE"],"filingForms":["10-K","10-Q","8-K"],"filingLimit":3,"seriesLimit":2}' \
  | jq '{schemaVersion,productId,mode,mockDataUsed,liveSettlementAllowed,externalSideEffectsAllowed,sourceEvidence,reportSummary}'
```

Show defensive cyber preview from live read-only public sources:

```bash
curl -fsS -X POST "$AOE_BASE_URL/v1/adapters/cyber/vuln-priority/preview" \
  -H 'content-type: application/json' \
  -d '{"cves":["CVE-2023-34362","CVE-2024-3094"]}' \
  | jq '{mode,x402Stream,paidProductId,report:{schemaVersion,generatedAt,sources,caveats,items:.report.items[0:2]}}'
```

Show separate wildfire read-only previews without treating them as paid x402
products:

```bash
curl -fsS -X POST "$AOE_BASE_URL/v1/adapters/wildfire/alerts/preview" \
  -H 'content-type: application/json' \
  -d '{"area":"CO"}' \
  | jq '{mode,x402Stream,boundary,workstreamId,report:{source,caveats,alerts:.report.alerts[0:2]}}'

curl -fsS -X POST "$AOE_BASE_URL/v1/adapters/wildfire/wfigs-perimeters/preview" \
  -H 'content-type: application/json' \
  -d '{"state":"CA","limit":3}' \
  | jq '{mode,x402Stream,boundary,workstreamId,report:{source,caveats,perimeters:.report.perimeters[0:3]}}'
```

Show quote, 402 gate, and simulated unlock:

```bash
curl -fsS "$AOE_BASE_URL/v1/artifacts/aoe_cyber_kev_epss_priority/quote" | jq .

curl -i "$AOE_BASE_URL/v1/artifacts/aoe_cyber_kev_epss_priority/content"

export AOE_WORK_ORDER_ID="$(
  curl -sS "$AOE_BASE_URL/v1/artifacts/aoe_cyber_kev_epss_priority/content" \
    | jq -r '.workOrderId'
)"

curl -fsS "$AOE_BASE_URL/v1/artifacts/aoe_cyber_kev_epss_priority/content" \
  -H "X-AOE-Payment: simulated:${AOE_WORK_ORDER_ID}" \
  | jq '{artifactId,productId,title,rights,productDisclaimers,receipt,ledger:{written,containsSecrets}}'
```

Show preflight refusal/approval:

```bash
curl -fsS -X POST "$AOE_BASE_URL/v1/access/preflight" \
  -H 'content-type: application/json' \
  -d '{"artifactId":"aoe_cyber_kev_epss_priority","intendedUse":"defensive prioritization","buyerType":"msp","requestedRights":["derived_summary_access"]}' \
  | jq .
```

## Safety Claims To Say

- Payment is access control, not permission to resell raw source payloads.
- Default payments are simulated; optional x402 is Base Sepolia testnet only.
- `liveSettlementAllowed` is false and mainnet is out of scope.
- Market output is research context only: no advice, price targets, trading, or
  execution.
- Cyber output is defensive only: no exploit instructions, credential material,
  or unauthorized scanning.
- Wildfire and WFIGS routes are separate read-only situational previews: no
  dispatch, alerts, incident command, flight authorization, or drone action.
- Public previews and paid artifacts return source IDs, caveats, and provenance.

## Source And Provenance Story

The broker sells normalization, prioritization, checklists, summaries, hashes,
receipts, and source-cited evidence. It does not sell raw public datasets as if
payment created redistribution rights.

Live/read-only sources currently demonstrated:

- SEC EDGAR APIs for public filing metadata and archive links.
- FRED public graph CSV for quick macro observations; revision-sensitive claims
  require explicit FRED/ALFRED vintages before resale.
- CISA KEV, FIRST EPSS, and NVD for defensive vulnerability prioritization.
- NWS alerts and NIFC/WFIGS public ArcGIS perimeters as separate non-x402
  wildfire planning context.

## 60-Second Narrative

1. "This is Agent Opportunity Exchange: a small paid intelligence broker for
   agents. It exposes products, routes, source rights, readiness, and x402
   status before anyone pays."
2. "The featured proof is live SEC/FRED market evidence. The response shows
   source URLs, freshness, hashes, caveats, and no mock data, while still saying
   no investment advice or execution."
3. "The cyber adapter turns CVEs into a defensive fix-now queue from CISA KEV,
   EPSS, and NVD. It does not scan anything and does not include exploit steps."
4. "Wildfire and WFIGS are visible as a separate read-only lane. They are not
   paid incident-command or drone products."
5. "Now the x402 shape: preview and quote are public; full artifact content
   returns 402 until a simulated payment header unlocks a derived packet and a
   non-secret receipt."
6. "The core claim is not that public data is free to resell. The product is
   provenance, synthesis, readiness, and machine-readable proof behind a payment
   rail that stays simulated or testnet tonight."

## Recording Checklist

- Start from a clean terminal at `/Users/aribs/Code/agent-opportunity-exchange`.
- Show `npm run dev` and `AOE_BASE_URL=http://127.0.0.1:4402`.
- Show `/health`, `/v1/products`, `/v1/readiness`, and `/v1/x402/status`.
- Show the SEC/FRED live proof and one cyber preview.
- Show a wildfire preview only as `x402Stream: false`.
- Show 402 payment required, then simulated unlock with receipt.
- Do not say mainnet, live settlement, trading, scanning, Telegram sending, or
  drone action is enabled.
