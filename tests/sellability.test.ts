import { describe, expect, test } from "vitest";
import { products } from "../src/catalog.js";
import { buildSellabilityReport, scoreProductSellability } from "../src/sellability.js";

describe("sellability scorecard", () => {
  test("scores every product with a buyer-grade quality contract", () => {
    const report = buildSellabilityReport(new Date("2026-05-09T00:00:00.000Z"));
    expect(report.schemaVersion).toBe("sapphirealpha.sellability.v1");
    expect(report.products).toHaveLength(products.length);
    expect(report.overallScore).toBeGreaterThanOrEqual(70);
    expect(report.criticalIssues).toEqual([]);

    for (const product of report.products) {
      expect(product.score).toBeGreaterThanOrEqual(70);
      expect(product.eligibleForPaidPreview).toBe(true);
      expect(product.issues.filter((issue) => issue.severity === "critical")).toEqual([]);
    }
  });

  test("flags market-license review without blocking the green SEC/FRED stream", () => {
    const market = products.find((product) => product.productId === "market_regime_evidence_pack");
    expect(market).toBeDefined();

    const score = scoreProductSellability(market!);
    expect(score.livePreviewRoutes).toContain("/v1/streams/market-context/preview");
    expect(score.licenseReviewNeeded).toBe(true);
    expect(score.sourceRiskCounts.yellow).toBeGreaterThan(0);
    expect(score.issues.map((issue) => issue.code)).toContain("license_review_needed");
    expect(score.issues.filter((issue) => issue.severity === "critical")).toEqual([]);
  });

  test("keeps wildfire and drone sources out of paid x402 products", () => {
    const report = buildSellabilityReport(new Date("2026-05-09T00:00:00.000Z"));
    expect(JSON.stringify(report.products)).not.toContain("wildfire_in_x402_product");
    expect(JSON.stringify(report.products)).not.toContain("nasa_firms");
    expect(JSON.stringify(report.products)).not.toContain("nifc_wfigs");
  });
});
