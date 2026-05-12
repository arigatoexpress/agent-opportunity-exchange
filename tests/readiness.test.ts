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
    expect(readiness.contracts.routes.publicCount).toBeGreaterThanOrEqual(12);
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
    const opportunity = body.adapters.find((adapter: { adapterId: string }) => adapter.adapterId === "opportunity_public_programs");
    expect(opportunity).toEqual(
      expect.objectContaining({
        productId: "opportunity_intel_pack",
        x402Stream: true,
        status: "live_read_only",
        endpoint: "/v1/adapters/opportunities/public-programs/preview",
      }),
    );
    expect(opportunity.notes.join(" ")).toContain("SAM.gov opportunities remain key-required");
    const telegram = body.adapters.find((adapter: { adapterId: string }) => adapter.adapterId === "telegram_mini_app_registration");
    expect(telegram).toEqual(
      expect.objectContaining({
        workstreamId: "telegram_mini_app_opt_in",
        x402Stream: false,
        endpoint: "/v1/telegram/register",
      }),
    );
    expect(["key_required", "configured_stub"]).toContain(telegram.status);
    expect(telegram.notes.join(" ")).toContain("No Telegram sends");
  });
});
