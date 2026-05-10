import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { buildReadiness } from "../src/readiness.js";

describe("adapter readiness", () => {
  test("keeps live adapters side-effect free and settlement disabled", () => {
    const readiness = buildReadiness();
    expect(readiness.schemaId).toBe("aoe.readiness.v1");
    expect(readiness.liveSettlementAllowed).toBe(false);
    expect(readiness.externalSideEffectsAllowed).toBe(false);
    expect(readiness.counts.live_read_only).toBeGreaterThanOrEqual(4);
    expect(readiness.paymentRails.schemaId).toBe("aoe.payment_rails.v1");
    expect(readiness.paymentRails.counts.liveEnabled).toBe(0);
    expect(readiness.paymentRails.rails.map((rail) => rail.railId)).toContain("pay_sh_solana_sandbox");
    for (const rail of readiness.paymentRails.rails) {
      expect(rail.liveSettlementAllowed).toBe(false);
      expect(rail.externalSideEffectsAllowed).toBe(false);
    }
    for (const adapter of readiness.adapters) {
      expect(adapter.sideEffects).toBe("none");
      expect(adapter.liveSettlementAllowed).toBe(false);
    }
  });

  test("reports buyer-discovery contract coverage", () => {
    const readiness = buildReadiness();
    expect(readiness.contracts.buyerDiscoveryReady).toBe(true);
    expect(readiness.contracts.products.count).toBeGreaterThan(0);
    expect(readiness.contracts.products.missingSchemaIds).toEqual([]);
    expect(readiness.contracts.products.missingQualityMetadata).toEqual([]);
    expect(readiness.contracts.products.schemaIds).toContain("aoe.product.cyber_exploited_vuln_priority.v1");
    expect(readiness.contracts.routes.discoveryEndpoint).toBe("/v1/routes");
    expect(readiness.contracts.routes.count).toBeGreaterThanOrEqual(10);
    expect(readiness.contracts.routes.missingSchemaIds).toEqual([]);
    expect(readiness.contracts.routes.paidContentRouteIds).toContain("artifact_paid_content");
  });

  test("marks wildfire adapters as separate from x402 streams", () => {
    const readiness = buildReadiness();
    const wildfireAdapters = readiness.adapters.filter((adapter) => adapter.adapterId.startsWith("wildfire_"));
    expect(wildfireAdapters.length).toBeGreaterThan(0);
    for (const adapter of wildfireAdapters) {
      expect(adapter.productId).toBeNull();
      expect(adapter.x402Stream).toBe(false);
      expect(adapter.workstreamId).toBe("wildfire_drone_readiness_lane");
    }
  });

  test("exposes readiness API", async () => {
    const res = await createApp().request("/v1/readiness");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contracts.buyerDiscoveryReady).toBe(true);
    expect(body.contracts.routes.discoveryEndpoint).toBe("/v1/routes");
    expect(body.adapters.map((adapter: { adapterId: string }) => adapter.adapterId)).toContain("cyber_vuln_priority");
    expect(body.adapters.map((adapter: { adapterId: string }) => adapter.adapterId)).toContain("market_sec_macro_context");
  });
});
