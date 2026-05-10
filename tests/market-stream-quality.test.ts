import { describe, expect, test } from "vitest";
import { buildSyntheticMarketFetch, findForbiddenBoundaryKeys, runMarketStreamQualityHarness } from "../scripts/market-stream-quality.js";

describe("market stream quality harness", () => {
  test("passes buyer-grade checks for the synthetic SEC plus FRED market stream", async () => {
    const result = await runMarketStreamQualityHarness({
      fetcher: buildSyntheticMarketFetch(),
      degradedFetcher: buildSyntheticMarketFetch({ secSubmissionsStatus: 429 }),
    });

    expect(result.overall).toBe("pass");
    expect(result.checks.map((check) => [check.id, check.status])).toEqual([
      ["stream-registry-linkage", "pass"],
      ["freshness", "pass"],
      ["provenance-source-ids", "pass"],
      ["normalized-record-hashes", "pass"],
      ["rights-envelope", "pass"],
      ["value-added-fields", "pass"],
      ["non-advice-non-execution-boundary", "pass"],
      ["degraded-source-behavior", "pass"],
    ]);
    expect(result.primaryReport.sources.map((source) => source.sourceId).sort()).toEqual(["fred_alfred", "sec_edgar"]);
    expect(result.primaryReport.evidenceProof.reportHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.degradedPreview.partial).toBe(true);
    expect(result.gaps).not.toContain("No normalized record hash is persisted for market stream rows yet.");
  });

  test("detects advice-shaped fields before they become sellable payload keys", () => {
    expect(
      findForbiddenBoundaryKeys({
        report: {
          priceTarget: 123,
          nested: [{ order: { side: "buy" } }],
          safeContext: "research only",
        },
      }),
    ).toEqual(["$.report.priceTarget", "$.report.nested[0].order"]);
  });
});
