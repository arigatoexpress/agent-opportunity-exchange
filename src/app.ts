import { Hono } from "hono";
import { z } from "zod";
import { buildVulnPriorityReport } from "./adapters/cyber.js";
import { fetchSecRecentFilings } from "./adapters/sec.js";
import { fetchWildfireAlerts } from "./adapters/wildfire.js";
import { artifacts, products, sources, getArtifact, getProduct } from "./catalog.js";
import { appendReceipt } from "./ledger.js";
import { buildQuote, buildReceipt, hasValidSimulatedPayment, paymentRequiredHeader, paymentRequiredPayload } from "./payments.js";
import { preflightSchema, runPreflight } from "./policy.js";

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

const secFilingsSchema = z
  .object({
    ticker: z.string().regex(/^[A-Z0-9.-]{1,12}$/i).optional(),
    cik: z.string().regex(/^\d{1,10}$/).optional(),
    forms: z.array(z.string().regex(/^[A-Z0-9-]{1,12}$/i)).max(10).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .refine((value) => value.ticker || value.cik, { message: "Provide ticker or cik." });

export function createApp() {
  const app = new Hono();

  app.get("/", (c) =>
    c.json({
      name: "Agent Opportunity Exchange",
      thesis: "Rights-cleared paid intelligence artifacts for agents and operators.",
      liveSettlementAllowed: false,
      externalSideEffectsAllowed: false,
      links: {
        health: "/health",
        wellKnown: "/.well-known/agent-opportunity-exchange.json",
        products: "/v1/products",
        sources: "/v1/sources",
        artifacts: "/v1/artifacts",
      },
    }),
  );

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
      description: "x402-ready, rights-cleared intelligence artifacts with public previews, quotes, preflight controls, and simulated receipts.",
      paymentProtocol: "x402",
      settlementMode: "simulated_or_testnet",
      liveSettlementAllowed: false,
      freeEndpoints: ["/v1/products", "/v1/sources", "/v1/artifacts", "/v1/artifacts/:id/preview", "/v1/artifacts/:id/quote"],
      paidEndpoints: ["/v1/artifacts/:id/content"],
      safety: ["/docs/SAFETY_BOUNDARIES.md"],
    }),
  );

  app.get("/v1/products", (c) => c.json({ products }));

  app.get("/v1/sources", (c) => c.json({ sources }));

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
        tags: artifact.tags,
        sourceIds: artifact.sourceIds,
        preview: artifact.preview,
      }));

    return c.json({ artifacts: rows });
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
        paidProductId: "wildfire_regional_intel_pack",
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
