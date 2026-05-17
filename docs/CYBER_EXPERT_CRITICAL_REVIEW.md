# Cyber Expert Critical Review

Date: 2026-05-17

## What I Would Do Differently

The first build made the right safety moves, but it was too endpoint-fragmented.
Case-store, deterministic preview, evals, provider status, public CVE refresh,
and local Ollama preview are useful primitives, but an operator should not have
to mentally compose them.

The second issue is that the model was too prominent in the product story. The
stronger product is the harness: source policy, normalized evidence, source
freshness, eval gates, local inference posture, human review, and proof hashes.
The local model should stay an optional wording and triage assistant inside that
system.

The third issue is fact volatility. CVE, KEV, EPSS, OSV, NVD, MSRC, vendor
advisory, TRM, and OFAC facts should stay RAG/retrieval-time evidence, not model
weights. Fine-tuning should be limited to style, schema following, refusal
behavior, prioritization labels, and escalation behavior.

The fourth issue is operational ergonomics. A buyer/operator needs one brief
that says: what is affected, what is fresh, what is stale, what is urgent, what
is blocked, what requires human review, and which sources support each claim.

## Iteration Shipped

The new preferred route is:

```bash
POST /v1/streams/cyber-expert/case-brief
```

It composes:

- deterministic cyber expert model preview;
- optional public CVE freshness from CISA KEV, FIRST EPSS, NVD, and OSV;
- optional local Windows/Ollama advisory output;
- operator decision posture and recommended actions;
- blocked actions and safety posture;
- proof hashes.

The route defaults local model use off. Public CVE refresh sends CVE ids only.
Local model output remains optional, hash-gated, and non-authoritative.
Deterministic-only case briefs remain public, but public-source refresh and
local-model advisory lanes now require simulated x402 route access.

## Hardening Iteration

The first critical follow-up shipped three guardrails:

- public CVE refresh now reports cache status and per-source duration, uses an
  in-memory TTL cache for default live fetches, caps normalized batches at 50
  CVEs, and keeps partial OSV results instead of degrading the whole source;
- Windows/Ollama preview now has tags/chat timeouts and a single-flight local
  chat guard so a slow GPU worker cannot pile up concurrent public requests;
- Cloud Run readiness now has a machine-readable `npm run gcp:smoke` script
  that checks health, readiness, routes, contracts, provider status, evals, and
  a deterministic case brief without deploying or mutating GCP.

## Product Iteration

The next pass shipped the missing operator surface:

- `POST /v1/streams/cyber-expert/case-brief/report` returns an escaped
  buyer-safe HTML report in a JSON contract;
- the public workbench now exposes deterministic Cyber Expert Case Brief, Cyber
  Expert HTML Report, and commitment-only Compliance Proof Preview modes;
- case-store records now carry compact `sourceEvidence` envelopes with owner,
  URL, rights license, rights risk, retrieval mode, TTL, and output policy;
- readiness now distinguishes no-side-effect routes from public CVE fetches and
  local model inference;
- `POST /v1/compliance/screening/decision-preview` accepts commitments and
  Merkle roots only, rejects raw wallet addresses, performs no TRM/OFAC call,
  and posts no on-chain proof.

## Remaining Risks

- MSRC, GitHub Advisory, and vendor-advisory refresh are still not wired into
  the case brief.
- The local model is useful but small; it should not be treated as a cyber
  expert without stronger retrieval, evals, and comparison tests.
- The TRM/OFAC lane is now commitment-preview-shaped, but it is still not
  connected to a live private buyer-authorized screening adapter.
- Eval coverage is still narrow compared with the intended roadmap.
- GitHub Advisory and MSRC CVE-only enrichment are source-verified but not yet
  wired into runtime enrichment.

## Next Best Build

Add GitHub Advisory and MSRC refresh behind the same CVE-only no-private-data
policy, then add OFAC SLS XML snapshot hashing and PDF export for the case
brief report.
