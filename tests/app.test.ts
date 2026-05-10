import { describe, expect, test, vi } from "vitest";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { createApp } from "../src/app.js";
import { artifacts, productRoutes, products } from "../src/catalog.js";
import { buildQuote, expectedSimulatedPayment } from "../src/payments.js";

const app = createApp();

describe("Agent Opportunity Exchange API", () => {
  test("health exposes the safety posture", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.paymentRail).toBe("simulated_header");
    expect(body.liveSettlementAllowed).toBe(false);
    expect(body.externalSideEffectsAllowed).toBe(false);
  });

  test("x402 status defaults to simulated and server-keyless", async () => {
    const res = await app.request("/v1/x402/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schemaId).toBe("aoe.x402.status.v1");
    expect(body.mode).toBe("simulated");
    expect(body.activeRail).toBe("simulated_header");
    expect(body.middlewareActive).toBe(false);
    expect(body.serverPrivateKeyRequired).toBe(false);
    expect(body.liveSettlementAllowed).toBe(false);
  });

  test("all registered products are simulated/testnet and side-effect free", () => {
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      expect(product.x402Stream).toBe(true);
      expect(product.settlementMode).toBe("simulated_or_testnet");
      expect(product.liveSettlementAllowed).toBe(false);
      expect(product.externalSideEffectsAllowed).toBe(false);
      expect(product.disclaimers.length).toBeGreaterThan(0);
      expect(product.schemaId).toMatch(/^aoe\.product\.[a-z0-9_]+\.v1$/);
      expect(product.contractVersion).toBe("v1");
      expect(product.quality.qualityTier).toBe("sellable_mvp");
      expect(product.quality.buyerValueMetrics.length).toBeGreaterThan(0);
      expect(product.quality.sourceFreshnessSla.ttlSeconds).toBeGreaterThan(0);
      expect(product.quality.sourceFreshnessSla.caveats.length).toBeGreaterThan(0);
      expect(product.quality.auditSignals.length).toBeGreaterThan(0);
      expect(product.tags).not.toContain("wildfire");
      expect(product.tags).not.toContain("drone-readiness");
    }
  });

  test("product discovery exposes buyer-facing contract metadata", async () => {
    const res = await app.request("/v1/products");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schemaId).toBe("aoe.discovery.products.v1");

    const cyberProduct = body.products.find((product: { productId: string }) => product.productId === "cyber_exploited_vuln_priority");
    expect(cyberProduct.schemaId).toBe("aoe.product.cyber_exploited_vuln_priority.v1");
    expect(cyberProduct.quality.buyerValueMetrics).toContainEqual(
      expect.objectContaining({
        metricId: "fix_now_queue",
        buyerFacingValue: expect.stringContaining("CVE list"),
      }),
    );
    expect(cyberProduct.quality.sourceFreshnessSla.caveats).toContain("No active scanning is performed by this product.");
  });

  test("well-known discovery points agents at product, route, readiness, and schema contracts", async () => {
    const res = await app.request("/.well-known/agent-opportunity-exchange.json");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.productDiscovery).toBe("/v1/products");
    expect(body.routeDiscovery).toBe("/v1/routes");
    expect(body.readiness).toBe("/v1/readiness");
    expect(body.x402Status).toBe("/v1/x402/status");
    expect(body.schemaIds.routeDiscovery).toBe("aoe.discovery.routes.v1");
    expect(body.schemaIds.x402Status).toBe("aoe.x402.status.v1");
    expect(body.freeEndpoints).toContain("/v1/routes");
    expect(body.qualityMetadata).toContain("sourceFreshnessSla");
  });

  test("route discovery covers public previews, simulated paid content, and separate lanes", async () => {
    const res = await app.request("/v1/routes");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schemaId).toBe("aoe.discovery.routes.v1");

    const paidContent = body.routes.find((route: { routeId: string }) => route.routeId === "artifact_paid_content");
    expect(paidContent).toEqual(
      expect.objectContaining({
        route: "/v1/artifacts/:id/content",
        access: "simulated_x402_payment",
        readiness: "simulated_payment_required",
        schemaId: "aoe.artifact.content.v1",
      }),
    );

    const marketPreview = body.routes.find((route: { routeId: string }) => route.routeId === "market_context_preview");
    expect(marketPreview.productIds).toEqual(["market_regime_evidence_pack"]);
    expect(marketPreview.freshnessSla.caveats.join(" ")).toContain("SEC");

    const marketLiveProof = body.routes.find((route: { routeId: string }) => route.routeId === "market_context_live_proof");
    expect(marketLiveProof).toEqual(
      expect.objectContaining({
        route: "/v1/streams/market-context/live-proof",
        access: "public",
        readiness: "live_read_only",
        schemaId: "aoe.market_live_upstream_proof.v1",
      }),
    );
    expect(marketLiveProof.caveats.join(" ")).toContain("not investment advice");

    const cyberInventoryPreview = body.routes.find((route: { routeId: string }) => route.routeId === "cyber_inventory_priority_preview");
    expect(cyberInventoryPreview).toEqual(
      expect.objectContaining({
        route: "/v1/adapters/cyber/inventory-priority/preview",
        access: "public",
        readiness: "live_read_only",
        schemaId: "sapphirealpha.cyber_inventory_priority.preview.v1",
      }),
    );
    expect(cyberInventoryPreview.caveats.join(" ")).toContain("No active scanning.");

    const wildfireRoute = body.routes.find((route: { routeId: string }) => route.routeId === "wildfire_alerts_preview");
    expect(wildfireRoute.x402Stream).toBe(false);
    expect(wildfireRoute.productIds).toEqual([]);
    expect(wildfireRoute.workstreamIds).toEqual(["wildfire_drone_readiness_lane"]);

    expect(productRoutes.map((route) => route.routeId)).toContain("access_preflight");
  });

  test("cyber inventory preview maps buyer assets to defensive priority evidence", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("cisa.gov")) {
        return jsonResponse({
          vulnerabilities: [
            {
              cveID: "CVE-2023-34362",
              vendorProject: "Progress",
              product: "MOVEit Transfer",
              dateAdded: "2023-06-02",
              dueDate: "2023-06-23",
              requiredAction: "Apply vendor update.",
            },
          ],
        });
      }

      if (url.includes("services.nvd.nist.gov")) {
        const cve = new URL(url).searchParams.get("cveId");
        return jsonResponse({
          vulnerabilities: [
            {
              cve: {
                id: cve,
                published: "2023-06-02T00:00:00.000",
                lastModified: "2023-06-03T00:00:00.000",
                descriptions: [{ lang: "en", value: `${cve} synthetic defensive summary.` }],
                metrics: {
                  cvssMetricV31: [{ cvssData: { baseScore: 9.8, baseSeverity: "CRITICAL" } }],
                },
              },
            },
          ],
        });
      }

      return jsonResponse({
        data: [{ cve: "CVE-2023-34362", epss: "0.920000", percentile: "0.990000", date: "2026-05-09" }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      const res = await app.request("/v1/adapters/cyber/inventory-priority/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer: { buyerId: "msp-demo", useCase: "renewal proof packet" },
          assets: [
            {
              assetId: "asset-1",
              hostname: "vpn-1",
              owner: "security",
              environment: "production",
              criticality: "critical",
              internetFacing: true,
              vulnerabilities: ["CVE-2023-34362"],
            },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.mode).toBe("read_only_public_preview");
      expect(body.sideEffects).toBe("none");
      expect(body.report.schemaVersion).toBe("sapphirealpha.cyber_inventory_priority.preview.v1");
      expect(body.report.input).toEqual(
        expect.objectContaining({
          cveCount: 1,
          assetRows: 1,
          authorizedInventoryRequired: true,
        }),
      );
      expect(body.report.findings[0]).toEqual(
        expect.objectContaining({
          cve: "CVE-2023-34362",
          tier: "fix_today",
          buyerEvidence: expect.objectContaining({
            affectedAssetCount: 1,
            exposureSignals: ["high_criticality_asset", "internet_facing_asset", "production_environment"],
          }),
        }),
      );
      expect(body.report.findings[0].buyerEvidence.affectedAssets[0]).toEqual(
        expect.objectContaining({
          assetId: "asset-1",
          hostname: "vpn-1",
          internetFacing: true,
        }),
      );
      expect(JSON.stringify(body)).not.toMatch(/payload:|run this exploit|proof-of-concept code|stolen credential/i);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("cyber inventory preview rejects empty inventory before source fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    try {
      const res = await app.request("/v1/adapters/cyber/inventory-priority/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: [{ hostname: "web-1", owner: "ops" }] }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("empty_cyber_inventory");
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
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
        route: "/v1/streams/market-context/live-proof",
        schemaVersion: "aoe.market_live_upstream_proof.v1",
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
      expect(body.report.filings[0].recordHash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(body.report.macro[0].recordHash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(body.report.evidenceProof.reportHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("exposes live SEC and FRED upstream proof without mock data or side effects", async () => {
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
      const res = await app.request("/v1/streams/market-context/live-proof", {
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
      expect(body.schemaId).toBe("aoe.market_live_upstream_proof.v1");
      expect(body.mode).toBe("read_only_live_source_probe");
      expect(body.mockDataUsed).toBe(false);
      expect(body.overall).toBe("pass");
      expect(body.upstream.sec_edgar.status).toBe("ok");
      expect(body.upstream.fred_alfred.status).toBe("ok");
      expect(body.reportSummary.evidenceProof.reportHash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(body.historicalClaimsPolicy).toEqual(
        expect.objectContaining({
          revisionAware: false,
          liveMacroReadMode: "fred_graph_csv",
          productionHistoricalClaimsRequire: "alfred_vintages",
        }),
      );
      expect(body.boundaries.liveSettlementAllowed).toBe(false);
      expect(body.boundaries.tradeExecution).toBe(false);
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
      expect(body.report.evidenceProof.reportHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("returns degraded SEC context when FRED temporarily times out", async () => {
    const originalTimeout = process.env.AOE_MARKET_FETCH_TIMEOUT_MS;
    process.env.AOE_MARKET_FETCH_TIMEOUT_MS = "250";
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
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
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted by test signal")));
      });
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
      expect(body.sourceStatus.fred_alfred.status).toBe("degraded");
      expect(body.report.company.name).toBe("Apple Inc.");
      expect(body.report.filings).toHaveLength(1);
      expect(body.report.macro).toEqual([]);
      expect(body.report.evidenceProof.reportHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    } finally {
      process.env.AOE_MARKET_FETCH_TIMEOUT_MS = originalTimeout;
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

  test("configured testnet mode emits official x402 payment requirements", async () => {
    const originalEnv = snapshotPaymentEnv();
    process.env.AOE_PAYMENT_MODE = "x402_testnet";
    process.env.AOE_X402_NETWORK = "eip155:84532";
    process.env.AOE_X402_PAY_TO = "0x1111111111111111111111111111111111111111";
    process.env.AOE_X402_FACILITATOR_URL = "https://x402.org/facilitator";
    vi.stubGlobal("fetch", async (url: string) => {
      if (url === "https://x402.org/facilitator/supported") {
        return jsonResponse({
          kinds: [{ x402Version: 2, scheme: "exact", network: "eip155:84532" }],
          extensions: [],
          signers: {},
        });
      }
      throw new Error(`Unexpected fetch in x402 test: ${url}`);
    });

    try {
      const testnetApp = createApp();
      const statusRes = await testnetApp.request("/v1/x402/status");
      const status = await statusRes.json();
      expect(status.mode).toBe("x402_testnet");
      expect(status.middlewareActive).toBe(true);
      expect(status.liveSettlementAllowed).toBe(false);

      const res = await testnetApp.request("/v1/artifacts/aoe_cyber_kev_epss_priority/content", {
        headers: { Accept: "application/json" },
      });
      expect(res.status).toBe(402);
      const header = res.headers.get("PAYMENT-REQUIRED");
      expect(header).toBeTruthy();
      const paymentRequired = decodePaymentRequiredHeader(header!);
      expect(paymentRequired.x402Version).toBe(2);
      expect(paymentRequired.accepts[0]).toEqual(
        expect.objectContaining({
          scheme: "exact",
          network: "eip155:84532",
          payTo: "0x1111111111111111111111111111111111111111",
        }),
      );
      expect(paymentRequired.accepts[0].amount).toBe("500000");
      const body = await res.json();
      expect(body.activeRail).toBe("official_x402_testnet");
      expect(body.quote.priceUsd).toBe("0.5000");
      expect(body.instructions.join(" ")).toContain("PAYMENT-SIGNATURE");
      expect(body.instructions.join(" ")).not.toContain("X-AOE-Payment");
    } finally {
      restorePaymentEnv(originalEnv);
      vi.unstubAllGlobals();
    }
  });

  test("testnet mode without payTo fails closed before content access", async () => {
    const originalEnv = snapshotPaymentEnv();
    process.env.AOE_PAYMENT_MODE = "x402_testnet";
    delete process.env.AOE_X402_PAY_TO;
    delete process.env.EVM_PAY_TO;

    try {
      const testnetApp = createApp();
      const res = await testnetApp.request("/v1/artifacts/aoe_cyber_kev_epss_priority/content");
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe("x402_testnet_not_ready");
      expect(body.status.errors).toContain("missing_AOE_X402_PAY_TO");
      expect(body.content).toBeUndefined();
    } finally {
      restorePaymentEnv(originalEnv);
    }
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

  test("preflight returns the buyer-visible product contract before access", async () => {
    const res = await app.request("/v1/access/preflight", {
      method: "POST",
      body: JSON.stringify({
        artifactId: "aoe_cyber_kev_epss_priority",
        maxPriceUsd: 1,
        allowedSourceIds: ["cisa_kev", "nvd_cve", "first_epss", "osv"],
      }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.allowed).toBe(true);
    expect(body.productContract).toEqual(
      expect.objectContaining({
        productId: "cyber_exploited_vuln_priority",
        schemaId: "aoe.product.cyber_exploited_vuln_priority.v1",
        qualityTier: "sellable_mvp",
      }),
    );
    expect(body.productContract.buyerValueMetrics[0].metricId).toBe("fix_now_queue");
    expect(body.productContract.sourceFreshnessSla.caveats).toContain("No active scanning is performed by this product.");
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

function snapshotPaymentEnv(): Record<string, string | undefined> {
  return {
    AOE_PAYMENT_MODE: process.env.AOE_PAYMENT_MODE,
    AOE_X402_NETWORK: process.env.AOE_X402_NETWORK,
    AOE_TESTNET_NETWORK: process.env.AOE_TESTNET_NETWORK,
    AOE_X402_PAY_TO: process.env.AOE_X402_PAY_TO,
    EVM_PAY_TO: process.env.EVM_PAY_TO,
    AOE_X402_FACILITATOR_URL: process.env.AOE_X402_FACILITATOR_URL,
    X402_FACILITATOR_URL: process.env.X402_FACILITATOR_URL,
  };
}

function restorePaymentEnv(snapshot: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
