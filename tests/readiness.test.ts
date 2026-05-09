import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { buildReadiness } from "../src/readiness.js";

describe("adapter readiness", () => {
  test("keeps live adapters side-effect free and settlement disabled", () => {
    const readiness = buildReadiness();
    expect(readiness.liveSettlementAllowed).toBe(false);
    expect(readiness.externalSideEffectsAllowed).toBe(false);
    expect(readiness.counts.live_read_only).toBeGreaterThanOrEqual(4);
    for (const adapter of readiness.adapters) {
      expect(adapter.sideEffects).toBe("none");
      expect(adapter.liveSettlementAllowed).toBe(false);
    }
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
    expect(body.adapters.map((adapter: { adapterId: string }) => adapter.adapterId)).toContain("cyber_vuln_priority");
    expect(body.adapters.map((adapter: { adapterId: string }) => adapter.adapterId)).toContain("market_sec_macro_context");
  });
});
