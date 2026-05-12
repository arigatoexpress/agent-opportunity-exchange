import { Hono } from "hono";
import { z } from "zod";
import { buildCyberInventoryPriorityPreview, buildVulnPriorityReport } from "./adapters/cyber.js";
import { fetchFredSeriesReport } from "./adapters/fred.js";
import { attachMarketContextEvidenceProof, fetchMarketContextReport, withSourceTimeout } from "./adapters/market-context.js";
import { buildOpportunityPublicProgramsPreview } from "./adapters/opportunity.js";
import { fetchSecRecentFilings } from "./adapters/sec.js";
import { fetchWfigsCurrentPerimeters, fetchWildfireAlerts } from "./adapters/wildfire.js";
import { buildBuyerProof, BUYER_PROOF_SCHEMA_ID } from "./buyer-proof.js";
import { artifacts, productRoutes, products, separateWorkstreams, sources, streams, getArtifact, getProduct } from "./catalog.js";
import { buildContractBundle, CONTRACT_BUNDLE_SCHEMA_ID } from "./contracts.js";
import { buildDemoGuide, DEMO_GUIDE_SCHEMA_ID, renderDemoGuideHtml } from "./demo-guide.js";
import { renderPublicFrontend } from "./frontend.js";
import { parseCyberInventory } from "./inputs/cyber-inventory.js";
import { appendReceipt } from "./ledger.js";
import { buildLiveMarketUpstreamProof } from "./live-market-proof.js";
import { buildQuote, buildReceipt, hasValidSimulatedPayment, paymentRequiredHeader, paymentRequiredPayload } from "./payments.js";
import { preflightSchema, runPreflight } from "./policy.js";
import { buildReadiness } from "./readiness.js";
import { renderCyberInventoryPriorityHtml } from "./reporting/cyber-html.js";
import {
  buildTelegramRegistrationReceipt,
  buildTelegramStatus,
  getTelegramBotToken,
  renderTelegramMiniAppHtml,
  TELEGRAM_REGISTRATION_SCHEMA_ID,
  telegramRegistrationRequestSchema,
  validateTelegramInitData,
} from "./telegram.js";
import { createX402TestnetGate } from "./x402-testnet.js";

const cvePrioritySchema = z.object({
  cves: z.array(z.string().regex(/^CVE-\d{4}-\d{4,}$/i)).min(1).max(100),
});

const cyberInventoryPreviewSchema = z.unknown().refine((body) => {
  if (!body || typeof body !== "object") return false;
  return JSON.stringify(body).length <= 200_000;
}, "Provide a JSON inventory payload under 200KB.");

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

const opportunityPublicProgramsSchema = z.object({
  keyword: z.string().trim().min(2).max(80),
  agencies: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
  limit: z.number().int().min(1).max(25).optional(),
  includeGrants: z.boolean().optional(),
  includeDataGov: z.boolean().optional(),
});

function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto = forwardedProto || url.protocol.replace(":", "");
  const host = forwardedHost || request.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

export function createApp() {
  const app = new Hono();
  const x402Gate = createX402TestnetGate();
  if (x402Gate.middleware) {
    app.use(x402Gate.middleware);
  }

  app.get("/favicon.ico", () => new Response(null, { status: 204 }));

  app.get("/", (c) => c.html(renderPublicFrontend()));

  app.get("/demo", (c) => c.html(renderDemoGuideHtml(publicOrigin(c.req.raw))));

  app.get("/telegram", (c) => c.html(renderTelegramMiniAppHtml(publicOrigin(c.req.raw))));

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "agent-opportunity-exchange",
      paymentMode: x402Gate.status.mode,
      paymentRail: x402Gate.status.activeRail,
      x402Ready: x402Gate.status.ready,
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
        contractBundle: CONTRACT_BUNDLE_SCHEMA_ID,
        buyerProof: BUYER_PROOF_SCHEMA_ID,
        demoGuide: DEMO_GUIDE_SCHEMA_ID,
        productDiscovery: "aoe.discovery.products.v1",
        routeDiscovery: "aoe.discovery.routes.v1",
        readiness: "aoe.readiness.v1",
        preflight: "aoe.access.preflight.v1",
        x402Status: "aoe.x402.status.v1",
        telegramStatus: "aoe.telegram.status.v1",
        telegramRegistration: TELEGRAM_REGISTRATION_SCHEMA_ID,
      },
      contractBundle: "/v1/contracts",
      buyerProof: "/v1/buyer-proof",
      demoGuide: "/v1/demo-guide",
      telegramMiniApp: "/telegram",
      telegramStatus: "/v1/telegram/status",
      productDiscovery: "/v1/products",
      routeDiscovery: "/v1/routes",
      readiness: "/v1/readiness",
      x402Status: "/v1/x402/status",
      qualityMetadata: "Products include schemaId, quality, buyerValueMetrics, sourceFreshnessSla, and caveats.",
      separateWorkstreams: ["/v1/separate-workstreams"],
      streams: "/v1/streams",
      featuredStream: "/v1/streams/market-context/live-proof",
      freeEndpoints: [
        "/v1/contracts",
        "/v1/buyer-proof",
        "/v1/demo-guide",
        "/telegram",
        "/v1/telegram/status",
        "/v1/products",
        "/v1/routes",
        "/v1/streams",
        "/v1/sources",
        "/v1/x402/status",
        "/v1/artifacts",
        "/v1/artifacts/:id/preview",
        "/v1/artifacts/:id/quote",
        "/v1/streams/market-context/live-proof",
        "/v1/streams/market-context/preview",
        "/v1/adapters/cyber/inventory-priority/report",
        "/v1/adapters/opportunities/public-programs/preview",
      ],
      paidEndpoints: ["/v1/artifacts/:id/content"],
      safety: ["/docs/SAFETY_BOUNDARIES.md"],
    }),
  );

  app.get("/v1/products", (c) => c.json({ schemaId: "aoe.discovery.products.v1", products }));

  app.get("/v1/contracts", (c) => c.json(buildContractBundle()));

  app.get("/v1/buyer-proof", (c) => c.json(buildBuyerProof()));

  app.get("/v1/demo-guide", (c) => c.json(buildDemoGuide(publicOrigin(c.req.raw))));

  app.get("/v1/telegram/status", (c) => c.json(buildTelegramStatus(publicOrigin(c.req.raw))));

  app.post("/v1/telegram/register", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = telegramRegistrationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          schemaId: TELEGRAM_REGISTRATION_SCHEMA_ID,
          registered: false,
          error: "invalid_registration_request",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
          outboundTelegramSendsAllowed: false,
          webhookRegistrationAllowed: false,
          messagesSent: 0,
          liveSettlementAllowed: false,
          externalSideEffectsAllowed: false,
        },
        400,
      );
    }

    const botToken = getTelegramBotToken();
    if (!botToken) {
      return c.json(
        {
          schemaId: TELEGRAM_REGISTRATION_SCHEMA_ID,
          registered: false,
          error: "telegram_bot_token_not_configured",
          reason: "AOE_TELEGRAM_BOT_TOKEN must be configured before trusting Telegram Mini App initData.",
          outboundTelegramSendsAllowed: false,
          webhookRegistrationAllowed: false,
          messagesSent: 0,
          liveSettlementAllowed: false,
          externalSideEffectsAllowed: false,
        },
        503,
      );
    }

    const validation = validateTelegramInitData(parsed.data.initData, botToken);
    if (!validation.ok) {
      return c.json(
        {
          schemaId: TELEGRAM_REGISTRATION_SCHEMA_ID,
          registered: false,
          error: "telegram_init_data_invalid",
          reason: validation.reason,
          rawInitDataEchoed: false,
          outboundTelegramSendsAllowed: false,
          webhookRegistrationAllowed: false,
          messagesSent: 0,
          liveSettlementAllowed: false,
          externalSideEffectsAllowed: false,
        },
        401,
      );
    }

    return c.json(buildTelegramRegistrationReceipt(parsed.data, validation));
  });

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

  app.get("/v1/x402/status", (c) =>
    c.json({
      schemaId: "aoe.x402.status.v1",
      ...x402Gate.status,
      middlewareActive: x402Gate.gateActive,
      docs: {
        sellerQuickstart: "https://docs.x402.org/getting-started/quickstart-for-sellers",
        buyerQuickstart: "https://docs.x402.org/getting-started/quickstart-for-buyers",
        networks: "https://docs.x402.org/core-concepts/network-and-token-support",
      },
    }),
  );

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

  app.post("/v1/adapters/cyber/inventory-priority/preview", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = cyberInventoryPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_cyber_inventory_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    try {
      const inventory = parseCyberInventory(parsed.data);
      if (inventory.cves.length === 0) {
        return c.json(
          {
            error: "empty_cyber_inventory",
            message: "Provide at least one CVE in cves, vulnerabilities, findings, assets, or asset rows.",
          },
          400,
        );
      }
      if (inventory.cves.length > 100) {
        return c.json(
          {
            error: "cyber_inventory_too_large",
            message: "Inventory previews are limited to 100 unique CVEs.",
          },
          400,
        );
      }
      const report = await buildCyberInventoryPriorityPreview(parsed.data);
      return c.json({
        mode: "read_only_public_preview",
        x402Stream: true,
        x402ProductId: "cyber_exploited_vuln_priority",
        paidProductId: "cyber_exploited_vuln_priority",
        readOnly: true,
        sideEffects: "none",
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

  app.post("/v1/adapters/cyber/inventory-priority/report", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = cyberInventoryPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_cyber_inventory_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    try {
      const inventory = parseCyberInventory(parsed.data);
      if (inventory.cves.length === 0) {
        return c.json(
          {
            error: "empty_cyber_inventory",
            message: "Provide at least one CVE in cves, vulnerabilities, findings, assets, or asset rows.",
          },
          400,
        );
      }
      if (inventory.cves.length > 100) {
        return c.json(
          {
            error: "cyber_inventory_too_large",
            message: "Inventory reports are limited to 100 unique CVEs.",
          },
          400,
        );
      }
      const report = await buildCyberInventoryPriorityPreview(parsed.data);
      return c.json({
        schemaId: "aoe.adapter.cyber_inventory_priority.report.v1",
        mode: "read_only_public_preview",
        x402Stream: true,
        x402ProductId: "cyber_exploited_vuln_priority",
        paidProductId: "cyber_exploited_vuln_priority",
        contentType: "text/html",
        readOnly: true,
        sideEffects: "none",
        report,
        reportHtml: renderCyberInventoryPriorityHtml(report),
        outputPolicy: report.outputPolicy,
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

  app.post("/v1/adapters/opportunities/public-programs/preview", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = opportunityPublicProgramsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_opportunity_public_programs_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    const report = await buildOpportunityPublicProgramsPreview(parsed.data);
    return c.json({
      mode: "read_only_public_preview",
      x402Stream: true,
      x402ProductId: "opportunity_intel_pack",
      paidProductId: "opportunity_intel_pack",
      readOnly: true,
      sideEffects: "none",
      report,
    });
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
        timeoutMs: marketFetchTimeoutMs(),
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
        const macro = await fetchFredSeriesReport({ seriesIds, limit: seriesLimit }, withSourceTimeout(fetch, marketFetchTimeoutMs())).catch((fallbackError) => {
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "Unknown FRED fallback error";
          return { error: `SEC degraded and FRED fallback failed: ${fallbackMessage}` };
        });
        if ("error" in macro) {
          return c.json(
            {
              error: "source_adapter_failed",
              message: macro.error,
              sourceStatus: {
                sec_edgar: { status: "degraded", message },
                fred_alfred: { status: "degraded", message: macro.error },
              },
            },
            502,
          );
        }
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
          report: attachMarketContextEvidenceProof({
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
          }),
        });
      }
      if (message.startsWith("FRED ")) {
        const filingForms = (parsed.data.filingForms ?? ["10-K", "10-Q", "8-K"]).map((form) => form.toUpperCase());
        const filingLimit = parsed.data.filingLimit ?? 5;
        const sec = await fetchSecRecentFilings(
          {
            ticker: parsed.data.ticker,
            forms: filingForms,
            limit: filingLimit,
          },
          withSourceTimeout(fetch, marketFetchTimeoutMs()),
        ).catch((fallbackError) => {
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "Unknown SEC fallback error";
          return { error: `FRED degraded and SEC fallback failed: ${fallbackMessage}` };
        });
        if ("error" in sec) {
          return c.json(
            {
              error: "source_adapter_failed",
              message: sec.error,
              sourceStatus: {
                sec_edgar: { status: "degraded", message: sec.error },
                fred_alfred: { status: "degraded", message },
              },
            },
            502,
          );
        }
        return c.json({
          mode: "read_only_public_preview",
          x402Stream: true,
          x402ProductId: "market_regime_evidence_pack",
          streamId: "sec_macro_context",
          previewPriceUsd: "1.0000",
          partial: true,
          sourceStatus: {
            sec_edgar: { status: "ok" },
            fred_alfred: { status: "degraded", message },
          },
          report: attachMarketContextEvidenceProof({
            schemaVersion: "sapphirealpha.market_context.v1",
            generatedAt: new Date().toISOString(),
            x402Stream: true,
            streamId: "sec_macro_context",
            query: {
              ticker: parsed.data.ticker.toUpperCase(),
              seriesIds: (parsed.data.seriesIds ?? ["FEDFUNDS", "UNRATE", "CPIAUCSL"]).map((seriesId) => seriesId.toUpperCase()),
              filingForms,
              filingLimit,
              seriesLimit: parsed.data.seriesLimit ?? 3,
            },
            sources: [
              { sourceId: "sec_edgar", retrievalMode: sec.source.retrievalMode, status: "ok" },
              { sourceId: "fred_alfred", retrievalMode: "read_only_public_csv", status: "degraded" },
            ],
            company: sec.company,
            filings: sec.filings,
            macro: [],
            highlights: sec.filings[0]
              ? [
                  {
                    label: "latest_filing",
                    value: `${sec.filings[0].form} filed ${sec.filings[0].filingDate}`,
                    sourceId: "sec_edgar",
                  },
                ]
              : [],
            caveats: [
              "FRED is temporarily degraded for this preview; retry later for macro observations.",
              "This degraded preview is source-cited SEC filing context only, not investment advice.",
              "No portfolio personalization, buy/sell/hold recommendation, price target, or trade execution is provided.",
            ],
          }),
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

  app.post("/v1/streams/market-context/live-proof", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = marketContextSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_market_live_proof_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    try {
      const proof = await buildLiveMarketUpstreamProof({
        ticker: parsed.data.ticker,
        seriesIds: parsed.data.seriesIds ?? ["FEDFUNDS", "UNRATE", "CPIAUCSL"],
        filingForms: parsed.data.filingForms,
        filingLimit: parsed.data.filingLimit ?? 3,
        seriesLimit: parsed.data.seriesLimit ?? 2,
        timeoutMs: marketFetchTimeoutMs(),
      });
      return c.json(proof);
    } catch (error) {
      return c.json(
        {
          error: "live_market_upstream_probe_failed",
          message: error instanceof Error ? error.message : "Unknown live market upstream probe error",
          mode: "read_only_live_source_probe",
          mockDataUsed: false,
          liveSettlementAllowed: false,
          externalSideEffectsAllowed: false,
        },
        502,
      );
    }
  });

  app.get("/v1/artifacts/:id/content", async (c) => {
    const artifact = getArtifact(c.req.param("id"));
    if (!artifact) return c.json({ error: "artifact_not_found" }, 404);

    const quote = buildQuote(artifact);
    if (x402Gate.status.mode === "x402_testnet" && !x402Gate.gateActive) {
      return c.json(
        {
          error: "x402_testnet_not_ready",
          liveSettlementAllowed: false,
          status: x402Gate.status,
          quote,
        },
        503,
      );
    }

    if (!x402Gate.gateActive && !hasValidSimulatedPayment(c.req.raw.headers, quote)) {
      return c.json(paymentRequiredPayload(quote), 402, {
        "Payment-Required": paymentRequiredHeader(quote),
        "X-AOE-Work-Order": quote.workOrderId,
      });
    }

    const receipt = x402Gate.gateActive
      ? buildReceipt(artifact, quote, new Date(), {
          rail: "official_x402_testnet",
          status: "pending_middleware_settlement",
          network: quote.accepted[0]?.network ?? x402Gate.status.network.id,
          asset: "USDC",
          amount: quote.priceUsd,
          facilitatorUrl: x402Gate.status.facilitator.url,
          liveSettlementAllowed: false,
        })
      : buildReceipt(artifact, quote);
    const ledgerPath = x402Gate.gateActive ? null : await appendReceipt(receipt);
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
        written: x402Gate.gateActive ? "after_x402_settlement_hook" : true,
        ...(ledgerPath ? { path: ledgerPath } : {}),
        containsSecrets: false,
      },
    });
  });

  return app;
}

function marketFetchTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.AOE_MARKET_FETCH_TIMEOUT_MS ?? "", 10);
  if (!Number.isFinite(parsed)) return 5_000;
  return Math.max(250, Math.min(parsed, 20_000));
}
