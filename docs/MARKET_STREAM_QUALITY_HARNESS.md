# Market Stream Quality Harness

The buyer-grade quality harness for the active sellable market stream lives in
`scripts/market-stream-quality.ts`.

Run it with:

```bash
npx tsx scripts/market-stream-quality.ts
```

For machine-readable output:

```bash
npx tsx scripts/market-stream-quality.ts --json
```

## What It Checks

- Freshness: generation timestamp, source cadence, rights TTL, filing dates, and
  latest macro observation dates.
- Provenance: stream source IDs, registry ownership and URLs, SEC archive links,
  FRED source URLs, and retrieval modes.
- Normalized record hashes: SEC filing rows, FRED observation rows, FRED series,
  and the combined report evidence proof expose deterministic `sha256:` hashes.
- Rights envelope: active sources must stay green, attribution-backed, and
  limited to derived facts with raw source resale prohibited.
- Buyer value: normalized query, highlights, parsed macro observations, SEC
  filing metadata, and source-cited context must exist.
- Degraded behavior: a synthetic SEC 429 must produce an honest partial preview
  with FRED data preserved and SEC marked degraded.
- Market boundary: output remains research-only, with no advice-shaped fields,
  no buy/sell/hold recommendation, no price target, and no trade execution.

The harness uses deterministic synthetic SEC and FRED fixtures so it is stable
in CI and can run without live upstream access.

## Current Gaps

- It does not prove live SEC/FRED uptime, latency, or rate-limit posture.
- FRED graph CSV checks are not revision-aware ALFRED vintage checks yet.
- The broader market product catalog still includes future yellow/licensed
  sources; this harness certifies only the active SEC/FRED stream.
