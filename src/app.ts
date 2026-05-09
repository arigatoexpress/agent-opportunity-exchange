import { Hono } from "hono";
import { z } from "zod";
import { buildVulnPriorityReport } from "./adapters/cyber.js";
import { fetchFredSeriesReport } from "./adapters/fred.js";
import { fetchMarketContextReport } from "./adapters/market-context.js";
import { fetchSecRecentFilings } from "./adapters/sec.js";
import { fetchWfigsCurrentPerimeters, fetchWildfireAlerts } from "./adapters/wildfire.js";
import { artifacts, productRoutes, products, separateWorkstreams, sources, streams, getArtifact, getProduct } from "./catalog.js";
import { renderPublicFrontend } from "./frontend.js";
import { appendReceipt } from "./ledger.js";
import { buildQuote, buildReceipt, hasValidSimulatedPayment, paymentRequiredHeader, paymentRequiredPayload } from "./payments.js";
import { preflightSchema, runPreflight } from "./policy.js";
import { buildReadiness } from "./readiness.js";

const cvePrioritySchema = z.object({
  cves: z.array(z.string().regex(/^CVE-\d{4}-\d{4,}$/i)).min(1).max(100),
});

const wildfireAlertsSchema = z
  .object({
    area: z.string().regex(/^[A-Z]{2}$/i).optional(),
    point: z
      .object({
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
      })
      .optional(),
  })
  .refine((value) => value.area || value.point, { message: "Provide area or point." });

const wfigsPerimetersSchema = z.object({
  state: z.string().regex(/^[A-Z]{2}$/i).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const secFilingsSchema = z
  .object({
    ticker: z.string().regex(/^[A-Z0-9.-]{1,12}$/i).optional(),
    cik: z.string().regex(/^\d{1,10}$/).optional(),
    forms: z.array(z.string().regex(/^[A-Z0-9-]{1,12}$/i)).max(10).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .refine((value) => value.ticker || value.cik, { message: "Provide ticker or cik." });

const fredSeriesSchema = z.object({
  seriesIds: z.array(z.string().regex(/^[A-Z0-9_.$-]{1,32}$/i)).min(1).max(25),
  limit: z.number().int().min(1).max(500).optional(),
});

const marketContextSchema = z.object({
  ticker: z.string().regex(/^[A-Z0-9.-]{1,12}$/i),
  seriesIds: z.array(z.string().regex(/^[A-Z0-9_.$-]{1,32}$/i)).min(1).max(12).optional(),
  filingForms: z.array(z.string().regex(/^[A-Z0-9-]{1,12}$/i)).max(8).optional(),
  filingLimit: z.number().int().min(1).max(25).optional(),
  seriesLimit: z.number().int().min(1).max(24).optional(),
});

export function createApp() {
  const app = new Hono();

  app.get("/favicon.ico", () => new Response(null, { status: 204 }));

  app.get("/", (c) => c.html(renderPublicFrontend()));

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "agent-opportunity-exchange",
      paymentMode: "simulated_or_testnet",
      liveSettlementAllowed: false,
      externalSideEffectsAllowed: false,
      timestamp: new Date().toISOString(),
    }),
  );

  app.get("/.well-known/agent-opportunity-exchange.json", (c) =>
    c.json({
      schemaVersion: 1,
      name: "Agent Opportunity Exchange",
      description: "x402-ready market and relevant-data streams with public previews, quotes, preflight controls, and simulated receipts.",
      paymentProtocol: "x402",
      settlementMode: "simulated_or_testnet",
      liveSettlementAllowed: false,
      x402Scope: "market_and_relevant_data_streams_only",
      schemaIds: {
        productDiscovery: "aoe.discovery.products.v1",
        routeDiscovery: "aoe.discovery.routes.v1",
        readiness: "aoe.readiness.v1",
        preflight: "aoe.access.preflight.v1",
      },
      productDiscovery: "/v1/products",
      routeDiscovery: "/v1/routes",
      readiness: "/v1/readiness",
      qualityMetadata: "Products include schemaId, quality, buyerValueMetrics, sourceFreshnessSla, and caveats.",
      separateWorkstreams: ["/v1/separate-workstreams"],
      streams: "/v1/streams",
      featuredStream: "/v1/streams/market-context/preview",
      freeEndpoints: [
        "/v1/products",
        "/v1/routes",
        "/v1/streams",
        "/v1/sources",
        "/v1/artifacts",
        "/v1/artifacts/:id/preview",
        "/v1/artifacts/:id/quote",
        "/v1/streams/market-context/preview",
      ],
      paidEndpoints: ["/v1/artifacts/:id/content"],
      safety: ["/docs/SAFETY_BOUNDARIES.md"],
    }),
  );

  app.get("/v1/products", (c) => c.json({ schemaId: "aoe.discovery.products.v1", products }));

  app.get("/v1/routes", (c) => c.json({ schemaId: "aoe.discovery.routes.v1", routes: productRoutes }));

  app.get("/v1/streams", (c) => c.json({ streams }));

  app.get("/v1/sources", (c) => c.json({ sources }));

  app.get("/v1/separate-workstreams", (c) => c.json({ workstreams: separateWorkstreams }));

  app.get("/v1/artifacts", (c) => {
    const q = c.req.query("q")?.toLowerCase();
    const category = c.req.query("category");
    const tag = c.req.query("tag");

    const rows = artifacts
      .filter((artifact) => (category ? artifact.category === category : true))
      .filter((artifact) => (tag ? artifact.tags.includes(tag) : true))
      .filter((artifact) => {
        if (!q) return true;
        return [artifact.title, artifact.description, artifact.category, artifact.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .map((artifact) => ({
        artifactId: artifact.artifactId,
        productId: artifact.productId,
        title: artifact.title,
        category: artifact.category,
        description: artifact.description,
        x402Stream: artifact.x402Stream,
        tags: artifact.tags,
        sourceIds: artifact.sourceIds,
        preview: artifact.preview,
      }));

    return c.json({ artifacts: rows });
  });

  app.get("/v1/readiness", (c) => c.json(buildReadiness()));

  app.get("/api/silos/health", (c) => {
    const readiness = buildReadiness();
    return c.json({
      mode: "public_silos_health_summary",
      service_summary: {
        healthy: readiness.counts.live_read_only,
        reporting: readiness.adapters.length,
        status_counts: readiness.counts,
      },
      silos: {
        exchange: { status: "active", x402Scope: "market_and_relevant_data_streams_only", x402Products: products.length },
        cyber: { status: "active", x402Stream: true },
        wildfire: { status: "separate", x402Stream: false, workstreamId: "wildfire_drone_readiness_lane" },
        markets: { status: "active", x402Stream: true },
        tho: { status: "separate", url: "https://tho.sapphirealpha.xyz/" },
      },
      admin_required_for: ["raw service hosts", "secret values", "production controls"],
      ts: new Date().toISOString(),
    });
  });

  app.get("/v1/artifacts/:id", (c) => {
    const artifact = getArtifact(c.req.param("id"));
    if (!artifact) return c.json({ error: "artifact_not_found" }, 404);
    const product = getProduct(artifact.productId);
    return c.json({
      artifact: {
        artifactId: artifact.artifactId,
        productId: artifact.productId,
        title: artifact.title,
        category: artifact.category,
        description: artifact.description,
        x402Stream: artifact.x402Stream,
        tags: artifact.tags,
        sourceIds: artifact.sourceIds,
        rights: artifact.rights,
        preview: artifact.preview,
      },
      product,
    });
  });

  app.get("/v1/artifacts/:id/preview", (c) => {
    const artifact = getArtifact(c.req.param("id"));
    if (!artifact) return c.json({ error: "artifact_not_found" }, 404);
    return c.json({
      artifactId: artifact.artifactId,
      title: artifact.title,
      description: artifact.description,
      x402Stream: artifact.x402Stream,
      tags: artifact.tags,
      sourceIds: artifact.sourceIds,
      rights: artifact.rights,
      preview: artifact.preview,
    });
  });

  app.get("/v1/artifacts/:id/quote", (c) => {
    const artifact = getArtifact(c.req.param("id"));
    if (!artifact) return c.json({ error: "artifact_not_found" }, 404);
    return c.json({ quote: buildQuote(artifact) });
  });

  app.post("/v1/access/preflight", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = preflightSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          allowed: false,
          reason: "invalid_preflight_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    const result = runPreflight(parsed.data);
    return c.json(result, result.allowed ? 200 : 409);
  });

  app.post("/v1/adapters/cyber/vuln-priority/preview", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = cvePrioritySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_cve_priority_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    try {
      const report = await buildVulnPriorityReport(parsed.data.cves);
      return c.json({
        mode: "read_only_public_preview",
        x402Stream: true,
        x402ProductId: "cyber_exploited_vuln_priority",
        paidProductId: "cyber_exploited_vuln_priority",
        report,
      });
    } catch (error) {
      return c.json(
        {
          error: "source_adapter_failed",
          message: error instanceof Error ? error.message : "Unknown source adapter error",
        },
        502,
      );
    }
  });

  app.post("/v1/adapters/wildfire/alerts/preview", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = wildfireAlertsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_wildfire_alert_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    try {
      const report = await fetchWildfireAlerts(parsed.data);
      return c.json({
        mode: "read_only_public_preview",
        x402Stream: false,
        workstreamId: "wildfire_drone_readiness_lane",
        boundary: "separate_from_x402_streams",
        report,
      });
    } catch (error) {
      return c.json(
        {
          error: "source_adapter_failed",
          message: error instanceof Error ? error.message : "Unknown source adapter error",
        },
        502,
      );
    }
  });

  app.post("/v1/adapters/wildfire/wfigs-perimeters/preview", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = wfigsPerimetersSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_wfigs_perimeters_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    try {
      const report = await fetchWfigsCurrentPerimeters(parsed.data);
      return c.json({
        mode: "read_only_public_preview",
        x402Stream: false,
        workstreamId: "wildfire_drone_readiness_lane",
        boundary: "separate_from_x402_streams",
        report,
      });
    } catch (error) {
      return c.json(
        {
          error: "source_adapter_failed",
          message: error instanceof Error ? error.message : "Unknown source adapter error",
        },
        502,
      );
    }
  });

  app.post("/v1/adapters/markets/sec-filings/preview", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = secFilingsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_sec_filings_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    try {
      const report = await fetchSecRecentFilings(parsed.data);
      return c.json({
        mode: "read_only_public_preview",
        x402Stream: true,
        x402ProductId: "market_regime_evidence_pack",
        paidProductId: "market_regime_evidence_pack",
        report,
      });
    } catch (error) {
      return c.json(
        {
          error: "source_adapter_failed",
          message: error instanceof Error ? error.message : "Unknown source adapter error",
        },
        502,
      );
    }
  });

  app.post("/v1/adapters/markets/fred-series/preview", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = fredSeriesSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_fred_series_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    try {
      const report = await fetchFredSeriesReport(parsed.data);
      return c.json({
        mode: "read_only_public_preview",
        x402Stream: true,
        x402ProductId: "market_regime_evidence_pack",
        paidProductId: "market_regime_evidence_pack",
        report,
      });
    } catch (error) {
      return c.json(
        {
          error: "source_adapter_failed",
          message: error instanceof Error ? error.message : "Unknown source adapter error",
        },
        502,
      );
    }
  });

  app.post("/v1/streams/market-context/preview", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = marketContextSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_market_context_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    try {
      const report = await fetchMarketContextReport({
        ticker: parsed.data.ticker,
        seriesIds: parsed.data.seriesIds ?? ["FEDFUNDS", "UNRATE", "CPIAUCSL"],
        filingForms: parsed.data.filingForms,
        filingLimit: parsed.data.filingLimit,
        seriesLimit: parsed.data.seriesLimit,
      });
      return c.json({
        mode: "read_only_public_preview",
        x402Stream: true,
        x402ProductId: "market_regime_evidence_pack",
        streamId: "sec_macro_context",
        previewPriceUsd: "1.0000",
        report,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown source adapter error";
      if (message.startsWith("SEC ")) {
        const seriesIds = parsed.data.seriesIds ?? ["FEDFUNDS", "UNRATE", "CPIAUCSL"];
        const seriesLimit = parsed.data.seriesLimit ?? 3;
        const macro = await fetchFredSeriesReport({ seriesIds, limit: seriesLimit });
        return c.json({
          mode: "read_only_public_preview",
          x402Stream: true,
          x402ProductId: "market_regime_evidence_pack",
          streamId: "sec_macro_context",
          previewPriceUsd: "1.0000",
          partial: true,
          sourceStatus: {
            sec_edgar: { status: "degraded", message },
            fred_alfred: { status: "ok" },
          },
          report: {
            schemaVersion: "sapphirealpha.market_context.v1",
            generatedAt: new Date().toISOString(),
            x402Stream: true,
            streamId: "sec_macro_context",
            query: {
              ticker: parsed.data.ticker.toUpperCase(),
              seriesIds: seriesIds.map((seriesId) => seriesId.toUpperCase()),
              filingForms: (parsed.data.filingForms ?? ["10-K", "10-Q", "8-K"]).map((form) => form.toUpperCase()),
              filingLimit: parsed.data.filingLimit ?? 5,
              seriesLimit,
            },
            sources: [
              { sourceId: "sec_edgar", retrievalMode: "read_only_public_api", status: "degraded" },
              { sourceId: "fred_alfred", retrievalMode: macro.source.retrievalMode, status: "ok" },
            ],
            company: null,
            filings: [],
            macro: macro.series,
            highlights: macro.series
              .filter((series) => series.latest)
              .map((series) => ({
                label: `${series.seriesId.toLowerCase()}_latest`,
                value: `${series.latest?.value ?? "missing"} on ${series.latest?.date ?? "unknown"}`,
                sourceId: "fred_alfred",
              })),
            caveats: [
              "SEC EDGAR is temporarily degraded for this preview; retry or provide a CIK later.",
              "This degraded preview is source-cited macro context only, not investment advice.",
              "No portfolio personalization, buy/sell/hold recommendation, price target, or trade execution is provided.",
            ],
          },
        });
      }
      return c.json(
        {
          error: "source_adapter_failed",
          message,
        },
        502,
      );
    }
  });

  app.get("/v1/artifacts/:id/content", async (c) => {
    const artifact = getArtifact(c.req.param("id"));
    if (!artifact) return c.json({ error: "artifact_not_found" }, 404);

    const quote = buildQuote(artifact);
    if (!hasValidSimulatedPayment(c.req.raw.headers, quote)) {
      return c.json(paymentRequiredPayload(quote), 402, {
        "Payment-Required": paymentRequiredHeader(quote),
        "X-AOE-Work-Order": quote.workOrderId,
      });
    }

    const receipt = buildReceipt(artifact, quote);
    const ledgerPath = await appendReceipt(receipt);
    const product = getProduct(artifact.productId);
    return c.json({
      artifactId: artifact.artifactId,
      productId: artifact.productId,
      title: artifact.title,
      category: artifact.category,
      content: artifact.content,
      rights: artifact.rights,
      productDisclaimers: product?.disclaimers ?? [],
      receipt,
      ledger: {
        written: true,
        path: ledgerPath,
        containsSecrets: false,
      },
    });
  });

  return app;
}
