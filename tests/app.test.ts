import { describe, expect, test, vi } from "vitest";
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
      expect(product.x402Stream).toBe(true);
      expect(product.settlementMode).toBe("simulated_or_testnet");
      expect(product.liveSettlementAllowed).toBe(false);
      expect(product.externalSideEffectsAllowed).toBe(false);
      expect(product.disclaimers.length).toBeGreaterThan(0);
      expect(product.tags).not.toContain("wildfire");
      expect(product.tags).not.toContain("drone-readiness");
    }
  });

  test("keeps wildfire and drone work out of the x402 artifact catalog", async () => {
    const productsRes = await app.request("/v1/products");
    const productsBody = await productsRes.json();
    expect(JSON.stringify(productsBody)).not.toContain("wildfire_regional_intel_pack");

    const artifactsRes = await app.request("/v1/artifacts");
    const artifactsBody = await artifactsRes.json();
    expect(JSON.stringify(artifactsBody)).not.toContain("drone");
    expect(JSON.stringify(artifactsBody)).not.toContain("wildfire");

    const separateRes = await app.request("/v1/separate-workstreams");
    const separateBody = await separateRes.json();
    expect(separateBody.workstreams[0].x402Stream).toBe(false);
    expect(separateBody.workstreams[0].workstreamId).toBe("wildfire_drone_readiness_lane");
  });

  test("exposes agent-readable x402 stream discovery", async () => {
    const res = await app.request("/v1/streams");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.streams).toContainEqual(
      expect.objectContaining({
        streamId: "sec_macro_context",
        productId: "market_regime_evidence_pack",
        x402Stream: true,
        route: "/v1/streams/market-context/preview",
        schemaVersion: "sapphirealpha.market_context.v1",
        liveSettlementAllowed: false,
      }),
    );
    expect(JSON.stringify(body)).not.toContain("wildfire");
    expect(JSON.stringify(body)).not.toContain("drone");
  });

  test("exposes a focused SEC plus macro market context stream", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.endsWith("/company_tickers.json")) {
        return jsonResponse({
          "0": { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
        });
      }
      if (url === "https://data.sec.gov/submissions/CIK0000320193.json") {
        return jsonResponse({
          name: "Apple Inc.",
          filings: {
            recent: {
              accessionNumber: ["0000320193-26-000013"],
              filingDate: ["2026-05-01"],
              reportDate: ["2026-03-28"],
              form: ["10-Q"],
              primaryDocument: ["aapl-20260328.htm"],
            },
          },
        });
      }
      const seriesId = new URL(url).searchParams.get("id");
      return new Response(`observation_date,${seriesId}
2026-04-01,4.3
`, { status: 200, headers: { "Content-Type": "text/csv" } });
    });

    try {
      const res = await app.request("/v1/streams/market-context/preview", {
        method: "POST",
        body: JSON.stringify({
          ticker: "AAPL",
          seriesIds: ["FEDFUNDS", "UNRATE"],
          filingLimit: 1,
          seriesLimit: 1,
        }),
        headers: { "Content-Type": "application/json" },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.x402Stream).toBe(true);
      expect(body.streamId).toBe("sec_macro_context");
      expect(body.report.schemaVersion).toBe("sapphirealpha.market_context.v1");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("returns degraded macro context when SEC temporarily rate limits", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.endsWith("/company_tickers.json")) {
        return jsonResponse({
          "0": { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
        });
      }
      if (url === "https://data.sec.gov/submissions/CIK0000320193.json") {
        return new Response("rate limited", { status: 429 });
      }
      const seriesId = new URL(url).searchParams.get("id");
      return new Response(`observation_date,${seriesId}
2026-04-01,4.3
`, { status: 200, headers: { "Content-Type": "text/csv" } });
    });

    try {
      const res = await app.request("/v1/streams/market-context/preview", {
        method: "POST",
        body: JSON.stringify({
          ticker: "AAPL",
          seriesIds: ["FEDFUNDS"],
          filingLimit: 1,
          seriesLimit: 1,
        }),
        headers: { "Content-Type": "application/json" },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.partial).toBe(true);
      expect(body.sourceStatus.sec_edgar.status).toBe("degraded");
      expect(body.report.company).toBeNull();
      expect(body.report.filings).toEqual([]);
      expect(body.report.macro[0].seriesId).toBe("FEDFUNDS");
    } finally {
      vi.unstubAllGlobals();
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
    expect(body.ledger.written).toBe(true);
    expect(body.ledger.containsSecrets).toBe(false);
  });

  test("preflight blocks prices over caller cap", async () => {
    const res = await app.request("/v1/access/preflight", {
      method: "POST",
      body: JSON.stringify({
        artifactId: "aoe_macro_regime_public_evidence",
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

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
