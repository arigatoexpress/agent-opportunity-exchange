# Cyber Expert Harness Roadmap

Last updated: 2026-05-17

## Decision

Build our cyber expert as a harness, not as a single fine-tuned model. The
product name stays independent of Microsoft MDASH and Anthropic Mythos; those
systems are public research signals that validate the architecture pattern.

The first AOE implementation surface is:

- `/v1/streams/cyber-expert-harness/blueprint`
- schema: `aoe.cyber_expert_harness.blueprint.v1`
- product: `cyber_expert_harness_blueprint`

It returns a machine-readable architecture contract that folds the current
research into repo-safe next steps.

The second AOE implementation surface is:

- `/v1/streams/cyber-expert/case-store`
- schema: `aoe.cyber_expert_case_store.preview.v1`
- product: `cyber_expert_case_store_pack`

It returns hashed, source-linked evidence records and RAG documents that a
future local model can safely summarize. It does not call live sources, does
not call TRM/OFAC, and does not echo hostnames, raw wallet addresses, notes,
secrets, or vendor payloads.

The third AOE implementation surface is:

- `/v1/streams/cyber-expert/model-preview`
- schema: `aoe.cyber_expert_model_preview.v1`
- product: `cyber_expert_model_preview_pack`

It consumes the same payload as the case-store route and returns the future
model response shape with deterministic rules only. It makes zero model calls,
zero paid API calls, and zero local GPU calls.

The fourth AOE implementation surface is:

- `/v1/streams/cyber-expert/evals`
- schema: `aoe.cyber_expert_eval_report.v1`

It exposes deterministic eval fixtures for the model-preview safety contract as
a public read-only route. It runs no model, GPU, paid API, TRM/OFAC, or scan
calls.

The fifth AOE implementation surface is:

- `/v1/streams/cyber-expert/provider-status`
- schema: `aoe.cyber_expert_provider_status.v1`

It reports the resolved provider gate without echoing environment values or
calling providers.

The sixth AOE implementation surface is:

- `/v1/streams/cyber-expert/windows-ollama/status`
- schema: `aoe.cyber_windows_ollama_status.v1`

It reads `/api/tags` from a configured `AOE_WINDOWS_OLLAMA_URL`, hashes the
endpoint and model names, and never calls `/api/chat`, `/api/generate`, or
embedding endpoints.

## Public Research Takeaways

- Microsoft describes MDASH as a multi-model agentic scanning harness with
  specialized stages: prepare, scan, validate, deduplicate, prove, and report.
- Microsoft agent security guidance makes application-layer controls decisive:
  scoped agents, least privilege, deterministic human review, and agent
  identity.
- Security Copilot public docs separate agents, plugins, connectors, and
  promptbooks. That maps well to AOE streams and explicit adapters.
- CyberGym and OSS-CRS are the strongest open public eval/build references for
  cyber-reasoning systems. Use them for evaluation patterns and local,
  resource-aware orchestration, not for shipping public exploit artifacts.
- Anthropic Mythos and Claude Security reinforce the same boundary: powerful
  cyber agents need repository scope, constrained access, and human-reviewed
  patches.

## Local Architecture

The target harness has these bounded agents:

- `scope_cartographer`
- `source_rights_auditor`
- `code_auditor`
- `vuln_priority_analyst`
- `crypto_exploit_intel_analyst`
- `compliance_proof_writer`
- `safe_proof_planner`
- `client_report_writer`

The pipeline is:

1. prepare
2. scan
3. validate
4. dedup
5. prove
6. report

The model is only one input. Current facts stay in retrieval. Fine-tuning, if
used, is only for rights-cleared demonstrations of format, taxonomy, refusal,
agent routing, and escalation behavior.

## Case Store Contract

The case store is the bridge from raw context to model reasoning. It accepts:

- authorized inventory or CVEs;
- public crypto incident metadata;
- commitment-only compliance proof seeds;
- private operator notes.

It emits:

- `caseHash`;
- evidence records with source ids, TTLs, caveats, and record hashes;
- RAG documents derived from those records;
- a retrieval plan for current facts;
- a model-preview contract that lists allowed and blocked uses.

It intentionally suppresses private values. Hostnames, wallet addresses, notes,
secrets, raw inventories, and KYT/vendor payloads should never appear in public
responses.

## Model Preview Contract

The deterministic model preview returns:

- `modelRuntime` with `provider: rules_only_no_model_call`;
- `requestedProvider`, `status`, and provider gate details;
- executive summary;
- priority queue with evidence citations;
- crypto exploit defensive notes;
- compliance proof notes;
- human review queue;
- blocked actions;
- source coverage;
- the embedded case-store packet;
- proof hash.

This route is deliberately not an LLM integration yet. It proves the contract
we want a local Windows/Ollama worker, OpenAI fine-tuned adapter, or cloud
eval provider to satisfy later.

The provider gate currently recognizes future providers:

- `windows_ollama_capped_worker`
- `openai_supervised_summary_adapter`
- `vertex_or_vllm_batch_eval`

All future providers still resolve to `rules_only_no_model_call` today. They
remain blocked unless explicit env gates, eval pass acknowledgement, and
provider-specific config exist; even with those present, live calls remain
blocked until a provider adapter is implemented and reviewed.

## Eval Contract

The eval route currently checks:

- critical internet-facing affectedness produces a cited `fix_today` item;
- wallet-looking values and private notes do not echo;
- non-pass compliance proof commitments create human-review gates;
- the preview stays rules-only, no-provider, no-GPU, no-paid-API, and
  side-effect-free.

## Operator Checks

Provider gate:

```bash
curl -sS http://127.0.0.1:4402/v1/streams/cyber-expert/provider-status
```

Eval report:

```bash
curl -sS http://127.0.0.1:4402/v1/streams/cyber-expert/evals
```

Combined CLI status:

```bash
npm run cyber:expert-status
```

Windows/Ollama read-only status when the Windows host is intentionally in
scope:

```bash
AOE_WINDOWS_OLLAMA_URL=http://192.168.1.61:11434 npm run cyber:expert-status
```

These checks must remain read-only. They should not download models, call
OpenAI, start GCP jobs, invoke `/api/chat`, invoke `/api/generate`, post proofs,
send Telegram messages, or touch live trading/money movement.

## Local Ollama Preview Lane

The first local model lane is now a gated Windows/Ollama preview route:

```bash
AOE_CYBER_MODEL_PROVIDER=windows_ollama_capped_worker \
AOE_CYBER_MODEL_PROVIDER_ENABLED=true \
AOE_CYBER_MODEL_EVAL_SUITE_HASH=<current evalSuiteHash from npm run cyber:expert-status> \
AOE_CYBER_MODEL_CHAT_ALLOWED=true \
AOE_WINDOWS_OLLAMA_URL=http://192.168.1.61:11434 \
AOE_CYBER_MODEL_NAME=qwen3:8b \
npm run cyber:expert-status
```

Model-preview route:

```bash
POST /v1/streams/cyber-expert/windows-ollama/preview
```

The route remains separate from `/v1/streams/cyber-expert/model-preview` and
`/v1/streams/cyber-expert/evals`, which are always deterministic and rules-only.
When every gate is enabled, the local route:

- checks `/api/tags` first and requires the configured model to be installed;
- requires the current deterministic eval-suite hash, not just a stale boolean;
- calls `/api/chat` at most once per request;
- uses `stream=false`, `think=false`, `temperature=0`, structured JSON format,
  and `keep_alive=0` by default;
- hashes endpoint and model identity instead of echoing them;
- suppresses raw prompt and raw model output;
- refuses sensitive model output instead of returning it;
- never calls `/api/generate`, embeddings, pull, delete, create, copy, show, or
  ps endpoints.

Verified live on 2026-05-17 with Windows/Ollama at `192.168.1.61:11434` and
`qwen3:8b` installed: one `/api/tags`, one `/api/chat`, one local GPU inference,
zero paid API calls, and no banned Ollama endpoints.

## Public CVE Refresh Lane

The first live public-source refresh route is:

```bash
POST /v1/streams/cyber-expert/public-cve-refresh
```

It accepts CVE ids only and fetches:

- CISA KEV from the official public JSON feed;
- FIRST EPSS from the official public API;
- NVD CVE 2.0 metadata;
- OSV vulnerability metadata by id.

It never sends buyer inventory, hostnames, notes, secrets, wallets, customer
identifiers, or exploit payloads to public sources. KEV, EPSS, NVD, and OSV are
treated as prioritization evidence only; buyer affectedness still comes from
authorized private inventory, and final remediation claims still require
vendor-advisory refresh.

## Preferred Operator Entry Point

The product should now default humans and buyer agents to:

```bash
POST /v1/streams/cyber-expert/case-brief
```

This route is intentionally a composition layer, not another model experiment.
It returns:

- deterministic case-store and model-preview evidence;
- optional public CVE freshness from CISA KEV, FIRST EPSS, NVD, and OSV;
- optional local Windows/Ollama advisory output when explicitly requested and
  hash-gated;
- an `operatorDecision` block with posture, fix-today count, KEV count, high
  EPSS count, recommended actions, and blocked actions.

Critical product lesson: the separate primitive routes are useful for testing,
but the case brief is the shape that should become sellable. It keeps the
MDASH lesson intact: the harness and evidence pipeline are the product; the
model is an optional summarizer inside that pipeline.

## Data Policy

Train only on derived, rights-cleared examples. Keep the following RAG-only or
private:

- current CVE, KEV, EPSS, NVD, OSV, MSRC, GitHub advisory, and vendor facts
- TRM, Chainabuse, OFAC, KYT, and private compliance responses
- recent crypto exploit incident details
- repository code and customer inventory

Never train on private TRM/KYT results, raw wallet addresses, customer
inventory, unpatched exploit instructions, weaponized PoCs, credential material,
or source payloads without training rights.

## Windows GPU Posture

Use the Windows GPU as a capped worker after model inventory and resource
limits are explicit:

- explicit model downloads only
- concurrency and VRAM caps
- no unbounded background training
- no live target scanning
- no wallet signing, trade execution, or Telegram/customer sends
- preserve 0G integration surfaces

## TRM / OFAC Proof Lane

Use TRM or similar KYT as a private screening adapter, and OFAC as the official
public sanctions anchor. Public proof should contain commitments, not raw wallet
addresses:

- `subjectCommitment`
- `sourceMerkleRoot`
- `decision`
- `policyVersion`
- `decisionTime`
- `expiry`
- `issuerSignature`

Raw wallet addresses, case salts, vendor responses, analyst notes, and customer
identifiers stay private.

## Source Links

- Microsoft MDASH blog:
  https://www.microsoft.com/en-us/security/blog/2026/05/12/defense-at-ai-speed-microsofts-new-multi-model-agentic-security-system-tops-leading-industry-benchmark/
- Microsoft autonomous agent defense-in-depth:
  https://www.microsoft.com/en-us/security/blog/2026/05/14/defense-in-depth-autonomous-ai-agents/
- Microsoft Security Copilot docs:
  https://learn.microsoft.com/en-us/copilot/security/
- CyberGym:
  https://www.cybergym.io/
- OSS-CRS:
  https://github.com/ossf/oss-crs
- Team Atlanta Atlantis:
  https://github.com/Team-Atlanta/aixcc-afc-atlantis
- Anthropic Mythos public assessment:
  https://red.anthropic.com/2026/mythos-preview/
- TRM Sanctions API:
  https://docs.sanctions.trmlabs.com/
- OFAC Sanctions List Service:
  https://ofac.treasury.gov/sanctions-list-service
