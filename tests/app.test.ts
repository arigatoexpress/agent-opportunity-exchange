import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { artifacts, products } from "../src/catalog.js";
import { buildQuote, expectedSimulatedPayment } from "../src/payments.js";

const app = createApp();

describe("Agent Opportunity Exchange API", () => {
  test("health exposes the safety posture", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.liveSettlementAllowed).toBe(false);
    expect(body.externalSideEffectsAllowed).toBe(false);
  });

  test("all registered products are simulated/testnet and side-effect free", () => {
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      expect(product.settlementMode).toBe("simulated_or_testnet");
      expect(product.liveSettlementAllowed).toBe(false);
      expect(product.externalSideEffectsAllowed).toBe(false);
      expect(product.disclaimers.length).toBeGreaterThan(0);
    }
  });

  test("artifacts expose previews without full content", async () => {
    const artifact = artifacts[0];
    const res = await app.request(`/v1/artifacts/${artifact.artifactId}/preview`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preview.headline).toContain(" ");
    expect(body.content).toBeUndefined();
  });

  test("full content returns x402-style 402 until payment is presented", async () => {
    const artifact = artifacts.find((row) => row.artifactId === "aoe_cyber_kev_epss_priority");
    expect(artifact).toBeDefined();

    const res = await app.request(`/v1/artifacts/${artifact!.artifactId}/content`);
    expect(res.status).toBe(402);
    expect(res.headers.get("Payment-Required")).toBeTruthy();
    const body = await res.json();
    expect(body.protocol).toBe("x402");
    expect(body.liveSettlementAllowed).toBe(false);
    expect(body.workOrderId).toBe(buildQuote(artifact!).workOrderId);
  });

  test("simulated payment returns content and a non-live receipt", async () => {
    const artifact = artifacts.find((row) => row.artifactId === "aoe_cyber_kev_epss_priority")!;
    const quote = buildQuote(artifact);
    const res = await app.request(`/v1/artifacts/${artifact.artifactId}/content`, {
      headers: {
        "X-AOE-Payment": expectedSimulatedPayment(quote.workOrderId),
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content.summary).toContain("defensible cyber wedge");
    expect(body.receipt.liveSettlementAllowed).toBe(false);
    expect(body.receipt.artifactHash).toMatch(/^sha256:/);
  });

  test("preflight blocks prices over caller cap", async () => {
    const res = await app.request("/v1/access/preflight", {
      method: "POST",
      body: JSON.stringify({
        artifactId: "aoe_wildfire_gunnison_readiness",
        maxPriceUsd: 0.25,
      }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.allowed).toBe(false);
    expect(body.reason).toBe("price_exceeds_max");
  });

  test("preflight blocks disallowed sources", async () => {
    const res = await app.request("/v1/access/preflight", {
      method: "POST",
      body: JSON.stringify({
        artifactId: "aoe_macro_regime_public_evidence",
        allowedSourceIds: ["fred_alfred"],
      }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.allowed).toBe(false);
    expect(body.reason).toBe("source_not_allowed");
    expect(body.blockedSourceIds).toContain("sec_edgar");
  });
});
