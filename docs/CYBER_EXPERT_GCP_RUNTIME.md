# Cyber Expert GCP / Local Runtime Operations

Last updated: 2026-05-17

## Scope

This note is the safe runtime posture for the AOE cyber expert system on Cloud
Run or a local Windows Ollama worker. It is docs-only guidance; it does not
authorize a deployment, provider enablement, live model run, or production
side effect.

The cyber expert product is a defensive evidence harness first. Cloud Run and
local Windows/Ollama are readiness surfaces until the relevant gates are set,
verified, and explicitly approved.

## Readiness Posture

Default posture:

- `liveSettlementAllowed=false`
- `externalSideEffectsAllowed=false`
- `outboundTelegramSendsAllowed=false`
- simulated/testnet payment posture only
- deterministic cyber expert routes stay `rules_only_no_model_call`
- no secret echoing, raw prompt echoing, or raw model-output echoing

Cloud Run posture:

- Treat `/health` as basic process reachability only.
- Treat `/v1/readiness`, `/v1/routes`, `/v1/contracts`, and the cyber expert
  routes as the real contract readback.
- Keep repo truth, candidate-revision truth, and production traffic truth
  separate. A healthy generic route does not prove the cyber expert contract is
  live.
- Do not deploy from this note. Deployment requires an explicit release
  decision, reviewed env values, route-level readbacks, and rollback awareness.

Local Windows/Ollama posture:

- `GET /v1/streams/cyber-expert/windows-ollama/status` may call only
  `/api/tags` when `AOE_WINDOWS_OLLAMA_URL` is configured.
- The model preview lane is blocked unless every model gate is present and the
  operator intentionally runs an authorized, redacted fixture.
- Even when enabled, the local model is advisory only. Deterministic evidence,
  source freshness, eval status, and human review remain authoritative.

## Env Gates

Leave model gates unset for normal Cloud Run readiness:

- `AOE_CYBER_MODEL_PROVIDER`
- `AOE_CYBER_MODEL_PROVIDER_ENABLED`
- `AOE_CYBER_MODEL_EVAL_PASSED`
- `AOE_CYBER_MODEL_EVAL_SUITE_HASH`
- `AOE_CYBER_MODEL_CHAT_ALLOWED`
- `AOE_WINDOWS_OLLAMA_URL`
- `AOE_CYBER_MODEL_NAME`

The local Windows/Ollama preview lane may be considered only when all required
values are present:

- `AOE_CYBER_MODEL_PROVIDER=windows_ollama_capped_worker`
- `AOE_CYBER_MODEL_PROVIDER_ENABLED=true`
- `AOE_CYBER_MODEL_EVAL_PASSED=true`
- `AOE_CYBER_MODEL_EVAL_SUITE_HASH=<current evalSuiteHash>`
- `AOE_CYBER_MODEL_CHAT_ALLOWED=true`
- `AOE_WINDOWS_OLLAMA_URL=<approved local Ollama base URL>`
- `AOE_CYBER_MODEL_NAME=<approved installed model>`

Optional caps should stay conservative when supported:

- `AOE_CYBER_MODEL_NUM_PREDICT`
- `AOE_CYBER_MODEL_KEEP_ALIVE`

Never store secrets in this repo, never print env values in public output, and
never use these gates to bypass human review.

## Allowed

- Read-only Cloud Run or local route checks.
- `npm run cyber:expert-status` for combined local posture.
- Cyber expert provider-status and eval readbacks.
- Authorized inventory or CVE-only test fixtures.
- Public CVE freshness checks that send CVE ids only.
- Deterministic-only case brief reports with `includePublicCveRefresh=false`
  and `includeLocalModel=false`.
- Commitment-only compliance decision previews using subject commitments,
  source roots, policy versions, and expiry metadata.
- 0G proof-readiness checks through `GET /v1/hackathon/0g-proof`, limited to
  public receipt readback for an existing 0guard anchor transaction.
- Windows/Ollama inventory checks through `/api/tags`.
- At most one `/api/chat` call per authorized preview request, only after all
  model gates and simulated x402 route access pass.
- Derived defensive summaries, remediation queues, evidence hashes, source
  citations, and human-review queues.

## Blocked

- No live trading.
- No Telegram sends.
- No proof posts.
- No scans.
- No live settlement, wallet signing, order signing, or money movement.
- No exploit payload generation, exploit instructions, credential material, or
  weaponized reconnaissance.
- No live TRM/OFAC/vendor screening calls from public routes.
- No raw wallet addresses or vendor payloads in compliance proof previews.
- No on-chain proof posting from the compliance preview route.
- No new 0G writes, 0G node start, wallet signing, transaction broadcast, or
  proof posting from the 0G proof-readiness route.
- No GCP jobs, provider calls, or model runs that are not explicitly gated.
- No Ollama `/api/generate`, embeddings, pull, delete, create, copy, show, or
  ps calls from the cyber expert runtime path.
- No raw wallet addresses, hostnames, secrets, notes, customer identifiers, or
  vendor payloads in public responses.

## Cloud Run Operator Checklist

Use this as a read-only readiness checklist unless a separate release approval
explicitly authorizes deployment.

1. Confirm the intended service, project, region, revision, and traffic target.
2. Confirm model-provider env gates are unset unless the release specifically
   approves the local-model path.
3. Confirm settlement and side-effect posture remain disabled.
4. Read back generic health:

   ```bash
   curl -fsS "$AOE_BASE_URL/health"
   ```

5. Read back contract surfaces:

   ```bash
   curl -fsS "$AOE_BASE_URL/v1/readiness"
   curl -fsS "$AOE_BASE_URL/v1/routes"
   curl -fsS "$AOE_BASE_URL/v1/contracts"
   curl -fsS "$AOE_BASE_URL/v1/hackathon/0g-proof"
   ```

6. Read back cyber expert readiness:

   ```bash
   curl -fsS "$AOE_BASE_URL/v1/streams/cyber-expert/provider-status"
   curl -fsS "$AOE_BASE_URL/v1/streams/cyber-expert/evals"
   ```

7. Run the machine smoke before claiming deploy readiness:

   ```bash
   AOE_BASE_URL="$AOE_BASE_URL" npm run gcp:smoke
   ```

8. Confirm responses still show no live trading, no Telegram sends, no proof
   posts, and no scans.
9. If `/health` passes but cyber routes fail or report stale contracts, report
   deploy drift. Do not claim production readiness from health alone.

## Local Windows Ollama Operator Checklist

Use this only when the Windows host is intentionally in scope and reachable.

1. Start with read-only status:

   ```bash
   AOE_WINDOWS_OLLAMA_URL=http://<windows-host>:11434 npm run cyber:expert-status
   ```

2. Record the current `evalSuiteHash` from the status output.
3. Verify the status path uses only `/api/tags` and does not call chat,
   generate, embeddings, pull, delete, create, copy, show, or ps endpoints.
4. Enable preview gates only in the current shell and only for an authorized,
   redacted fixture.
5. Include the simulated route-access header before local model preview; the
   public route should return `402` without it.
6. Confirm the preview response remains advisory, cites deterministic evidence,
   suppresses private values, and includes blocked actions.
7. Confirm timeout caps are conservative:

   ```bash
   AOE_CYBER_MODEL_TAGS_TIMEOUT_MS=3000
   AOE_CYBER_MODEL_CHAT_TIMEOUT_MS=20000
   ```

8. Unset the model gates after the check.
9. Do not use the local worker for live trading, Telegram sends, proof posts,
   scans, customer sends, wallet signing, or production writes.
