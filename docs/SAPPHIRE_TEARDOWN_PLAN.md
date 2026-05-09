# Reversible Sapphire Teardown Plan

This repo does not destructively tear down Sapphire. It creates a separate,
clean replacement path and a controlled retirement plan for anything that no
longer belongs in the new product.

## Interpretation

"Tear down Sapphire" means:

- stop treating the old monorepo as the product architecture;
- salvage only thesis, schemas, and proven safety patterns;
- retire duplicate dashboards, old claims, and local-only topology from the new
  business direction;
- leave production-adjacent systems intact until they have an explicit
  reversible cutover plan.

## Protected Boundaries

- Do not touch Project-Go-Forward.
- Do not touch THO or TexasHomeOutlet.
- Do not delete GCP projects, DNS, Firestore/GCS data, source repos, LaunchAgents,
  secrets, or production runtime assets.
- Do not enable real Telegram sends, live trading, or money movement.

## What Gets Salvaged

- x402 product catalog shape.
- source registry and rights-envelope concept.
- receipt/provenance hashes.
- public/admin separation.
- paper-only and read-only safety posture.
- selected dataset ideas: SEC, FRED, CISA/NVD/EPSS, FIRMS, NIFC, LANDFIRE,
  GDELT, Census, Data.gov.

## What Gets Retired From The New Product

- multi-silo Sapphire dashboard sprawl;
- local LaunchAgent assumptions;
- Telegram command paths;
- live-trading executor wiring;
- hardware inference mesh as product dependency;
- repo/satellite integration as architecture;
- any unclear source-rights or paywall-bypass framing.

## Practical Retirement Sequence

1. Keep `/Users/aribs/Code/Sapphire` clean on `origin/main`.
2. Build new revenue products only in `/Users/aribs/Code/agent-opportunity-exchange`.
3. Write a source-by-source salvage inventory before copying code.
4. Replace old Sapphire product claims with links to this repo only after a
   working paid artifact demo exists.
5. For any Sapphire routine that overlaps this repo, create a read-only
   comparator first.
6. Quarantine or archive old generated artifacts only when reproducible and
   unrelated to protected production paths.
7. Delete old Sapphire code only through a focused PR with tests, rollback, and
   no PGF/THO blast radius.

## Current Status

The first replacement artifact broker exists here. Sapphire remains untouched
except for read-only inspection.
