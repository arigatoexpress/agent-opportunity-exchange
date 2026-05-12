import { describe, expect, test } from "vitest";
import { buildBuyerProof, BUYER_PROOF_SCHEMA_ID } from "../src/buyer-proof.js";

describe("buyer proof", () => {
  test("summarizes buyer value, live proof routes, sellability, and safety posture", () => {
    const proof = buildBuyerProof(new Date("2026-05-12T12:00:00.000Z"));

    expect(proof.schemaId).toBe(BUYER_PROOF_SCHEMA_ID);
    expect(proof.generatedAt).toBe("2026-05-12T12:00:00.000Z");
    expect(proof.counts.products).toBeGreaterThan(0);
    expect(proof.counts.sources).toBeGreaterThan(0);
    expect(proof.counts.greenSources).toBeGreaterThan(0);
    expect(proof.counts.liveReadOnlyRoutes).toBeGreaterThan(0);
    expect(proof.sellability.overallScore).toBeGreaterThanOrEqual(90);
    expect(proof.sellability.criticalIssueCount).toBe(0);
    expect(proof.sellability.products.map((product) => product.productId)).toContain("cyber_exploited_vuln_priority");
    expect(proof.featuredProof.map((row) => row.route)).toContain("/v1/adapters/cyber/inventory-priority/report");
    expect(proof.featuredProof.map((row) => row.route)).toContain("/v1/adapters/opportunities/public-programs/preview");
    expect(proof.buyerValue.join(" ")).toContain("raw source resale");
    expect(proof.safety).toEqual(
      expect.objectContaining({
        liveSettlementAllowed: false,
        externalSideEffectsAllowed: false,
        rawSourceResaleAllowed: false,
        outboundTelegramSendsAllowed: false,
        activeScanningAllowed: false,
        tradingOrMoneyMovementAllowed: false,
      }),
    );
  });
});
