# Developer Quickstart

Agent Opportunity Exchange is a Hono/TypeScript service for rights-cleared,
x402-style paid intelligence packets. It is designed for demoable agent/buyer
integration without live settlement, trading, scanning, Telegram sends, or drone
action.

## Requirements

- Node.js 22 or newer.
- `jq` for the examples below.
- Network access for live read-only public adapters.

## Run Locally

```bash
cd /Users/aribs/Code/agent-opportunity-exchange
npm ci
cp .env.example .env.local
AOE_PAYMENT_MODE=simulated AOE_PORT=4402 npm run dev
```

In another terminal:

```bash
export AOE_BASE_URL=http://127.0.0.1:4402
curl -fsS "$AOE_BASE_URL/health" | jq .
```

The default local server listens on `http://127.0.0.1:4402`.

## Build And Start

```bash
cd /Users/aribs/Code/agent-opportunity-exchange
npm run build
AOE_PAYMENT_MODE=simulated AOE_PORT=4402 npm start
```

For deployed smoke tests, set the deployed origin and run the same contract
checks:

```bash
export AOE_BASE_URL=https://agent-opportunity-exchange-trgi34bxuq-uc.a.run.app
curl -fsS "$AOE_BASE_URL/health" | jq .
curl -fsS "$AOE_BASE_URL/v1/contracts" | jq '.schemaId, .coverage, .paymentBoundary'
curl -fsS "$AOE_BASE_URL/v1/readiness" | jq '.counts, .contracts.buyerDiscoveryReady'
curl -fsS "$AOE_BASE_URL/v1/x402/status" | jq .
```

Only describe a deployment as demo-ready when these commands confirm
`liveSettlementAllowed: false`, simulated or Base Sepolia testnet posture, and
contract/readiness coverage.

## Core Discovery Flow

```bash
curl -fsS "$AOE_BASE_URL/.well-known/agent-opportunity-exchange.json" | jq .
curl -fsS "$AOE_BASE_URL/v1/products" | jq '.products[] | {productId,title,priceUsd,sourceIds}'
curl -fsS "$AOE_BASE_URL/v1/routes" | jq '.routes[] | {routeId,method,route,access,x402Stream}'
curl -fsS "$AOE_BASE_URL/v1/sources" | jq '.sources[] | {sourceId,name,url,retrievalMode,rights}'
curl -fsS "$AOE_BASE_URL/v1/artifacts" | jq '.artifacts[] | {artifactId,productId,title,sourceIds}'
```

Useful artifact IDs:

- `aoe_cyber_kev_epss_priority`
- `aoe_macro_regime_public_evidence`
- `aoe_public_program_data_opportunity`
- `aoe_x402_api_change_radar`

## Paid Artifact Flow

Preview and quote are public:

```bash
curl -fsS "$AOE_BASE_URL/v1/artifacts/aoe_cyber_kev_epss_priority/preview" | jq .
curl -fsS "$AOE_BASE_URL/v1/artifacts/aoe_cyber_kev_epss_priority/quote" | jq .
```

Content is gated:

```bash
curl -i "$AOE_BASE_URL/v1/artifacts/aoe_cyber_kev_epss_priority/content"
```

For tonight's demo, unlock with the simulated header:

```bash
export AOE_WORK_ORDER_ID="$(
  curl -sS "$AOE_BASE_URL/v1/artifacts/aoe_cyber_kev_epss_priority/content" \
    | jq -r '.workOrderId'
)"

curl -fsS "$AOE_BASE_URL/v1/artifacts/aoe_cyber_kev_epss_priority/content" \
  -H "X-AOE-Payment: simulated:${AOE_WORK_ORDER_ID}" \
  | jq '{artifactId,productId,title,rights,receipt,ledger}'
```

The receipt is non-secret and the payment rail remains simulated unless the
explicit Base Sepolia testnet gate is configured.

## Live Read-Only Adapter Examples

SEC/FRED live upstream proof:

```bash
curl -fsS -X POST "$AOE_BASE_URL/v1/streams/market-context/live-proof" \
  -H 'content-type: application/json' \
  -d '{"ticker":"AAPL","seriesIds":["FEDFUNDS","UNRATE"],"filingForms":["10-K","10-Q","8-K"],"filingLimit":3,"seriesLimit":2}' \
  | jq .
```

SEC plus FRED market context preview:

```bash
curl -fsS -X POST "$AOE_BASE_URL/v1/streams/market-context/preview" \
  -H 'content-type: application/json' \
  -d '{"ticker":"MSFT","seriesIds":["FEDFUNDS","CPIAUCSL"],"filingLimit":3,"seriesLimit":3}' \
  | jq .
```

Defensive cyber CVE priority:

```bash
curl -fsS -X POST "$AOE_BASE_URL/v1/adapters/cyber/vuln-priority/preview" \
  -H 'content-type: application/json' \
  -d '{"cves":["CVE-2023-34362","CVE-2024-3094"]}' \
  | jq .
```

Cyber inventory preview:

```bash
curl -fsS -X POST "$AOE_BASE_URL/v1/adapters/cyber/inventory-priority/preview" \
  -H 'content-type: application/json' \
  -d '{"assets":[{"hostname":"demo-app","environment":"production","cves":["CVE-2023-34362"]}]}' \
  | jq .
```

Wildfire read-only lane, outside paid x402 products:

```bash
curl -fsS -X POST "$AOE_BASE_URL/v1/adapters/wildfire/alerts/preview" \
  -H 'content-type: application/json' \
  -d '{"area":"CO"}' \
  | jq .

curl -fsS -X POST "$AOE_BASE_URL/v1/adapters/wildfire/wfigs-perimeters/preview" \
  -H 'content-type: application/json' \
  -d '{"state":"CA","limit":5}' \
  | jq .
```

## Optional x402 Testnet Mode

Default mode is simulated. For Base Sepolia testnet only:

```bash
npm run x402:burner -- --write-env
set -a; source .env.x402.local; set +a
npm run dev
curl -fsS "$AOE_BASE_URL/v1/x402/status" | jq .
npm run x402:testnet:fetch -- aoe_cyber_kev_epss_priority
```

Do not use mainnet. Do not store buyer private keys on a server. Do not imply
payment grants redistribution rights.

## Safety Boundaries

- Simulated by default; Base Sepolia testnet only when explicitly configured.
- No live settlement or money movement.
- No trading, portfolio personalization, price targets, or execution.
- No unauthorized scans, exploit payloads, credential material, or offensive
  cyber output.
- No Telegram sends, customer sends, production data writes, dispatch, incident
  command, flight authorization, or drone action.
- Paid content is derived analysis with source links, caveats, hashes, and
  receipts; raw source resale is out of scope unless terms allow it.

## Lightweight Verification

```bash
npm run boundary
npm run typecheck
npm test
git diff --check -- docs/DEMO_VIDEO_RUNBOOK.md docs/DEVELOPER_QUICKSTART.md
git status --short -- docs/DEMO_VIDEO_RUNBOOK.md docs/DEVELOPER_QUICKSTART.md
```
