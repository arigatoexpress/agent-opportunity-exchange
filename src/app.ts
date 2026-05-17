import { Hono } from "hono";
import { z } from "zod";
import { buildCyberExpertCaseBrief, CYBER_EXPERT_CASE_BRIEF_SCHEMA_ID } from "./adapters/cyber-case-brief.js";
import { buildCyberExpertCaseStorePreview, CYBER_EXPERT_CASE_STORE_SCHEMA_ID } from "./adapters/cyber-case-store.js";
import { buildCyberExpertHarnessBlueprint, CYBER_EXPERT_HARNESS_SCHEMA_ID } from "./adapters/cyber-expert.js";
import { buildCyberExpertEvalReport, CYBER_EXPERT_EVAL_REPORT_SCHEMA_ID } from "./adapters/cyber-evals.js";
import { buildCyberExpertModelPreview, CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID } from "./adapters/cyber-model-preview.js";
import { resolveCyberModelProvider } from "./adapters/cyber-model-provider.js";
import { buildCyberOllamaModelPreview, CYBER_OLLAMA_MODEL_PREVIEW_SCHEMA_ID } from "./adapters/cyber-ollama-model.js";
import { fetchCyberPublicCveRefresh, CYBER_PUBLIC_CVE_REFRESH_SCHEMA_ID } from "./adapters/cyber-public-cve.js";
import { fetchCyberWindowsOllamaStatus, CYBER_WINDOWS_OLLAMA_STATUS_SCHEMA_ID } from "./adapters/cyber-windows-ollama.js";
import { buildComplianceDecisionPreview, COMPLIANCE_DECISION_PREVIEW_SCHEMA_ID } from "./adapters/compliance-decision-preview.js";
import { fetchZeroGProofReadiness, ZERO_G_PROOF_READINESS_SCHEMA_ID } from "./adapters/zero-g-proof.js";
import { buildCyberInventoryPriorityPreview, buildVulnPriorityReport } from "./adapters/cyber.js";
import {
  buildBanklessMcpManifest,
  buildCryptoResearchThesisReport,
  buildDefiReportInventory,
  fetchBanklessPodcastDigest,
} from "./adapters/crypto-research.js";
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
import {
  buildQuote,
  buildReceipt,
  buildRoutePreviewQuote,
  hasValidSimulatedPayment,
  paymentRequiredHeader,
  paymentRequiredPayload,
} from "./payments.js";
import { preflightSchema, runPreflight } from "./policy.js";
import { buildReadiness } from "./readiness.js";
import { renderCyberExpertCaseBriefHtml, renderCyberInventoryPriorityHtml } from "./reporting/cyber-html.js";
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
  cves: z.array(z.string().regex(/^CVE-\d{4}-\d{4,}$/i)).min(1).max(50),
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

const banklessPodcastSchema = z.object({
  query: z.string().trim().min(1).max(80).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

const cryptoThesisSchema = z.object({
  assetSymbol: z.string().trim().regex(/^[A-Z0-9.-]{1,16}$/i),
  coingeckoId: z.string().trim().regex(/^[a-z0-9-]{1,80}$/i),
  protocolSlug: z.string().trim().regex(/^[a-z0-9-]{1,100}$/i).optional(),
  banklessQuery: z.string().trim().min(1).max(80).optional(),
  days: z.number().int().min(30).max(365).optional(),
  includeLandscape: z.boolean().optional(),
});

const cyberExpertHarnessSchema = z.object({
  focus: z.enum(["all", "vulnerability_research", "crypto_exploit_intel", "msp_triage", "compliance_proofs"]).optional(),
  localGpu: z.boolean().optional(),
  includeMicrosoftPattern: z.boolean().optional(),
  includeOpenSourceCrs: z.boolean().optional(),
  includeComplianceProofs: z.boolean().optional(),
});

const cryptoIncidentInputSchema = z
  .object({
    incidentId: z.string().trim().max(80).optional(),
    protocol: z.string().trim().max(80).optional(),
    chain: z.string().trim().max(80).optional(),
    occurredAt: z.string().trim().max(40).optional(),
    lossUsd: z.number().nonnegative().finite().optional(),
    rootCause: z.string().trim().max(120).optional(),
    controlsFailed: z.array(z.string().trim().max(80)).max(10).optional(),
    publicSummary: z.string().trim().max(500).optional(),
    sourceUrls: z.array(z.string().url().startsWith("https://")).max(10).optional(),
  })
  .strict();

const complianceProofInputSchema = z
  .object({
    subjectCommitment: z.string().trim().max(160).optional(),
    decision: z.enum(["pass", "deny", "review", "expired", "unknown"]).optional(),
    policyVersion: z.string().trim().max(80).optional(),
    sourceMerkleRoot: z.string().trim().max(160).optional(),
    issuedAt: z.string().trim().max(40).optional(),
    expiresAt: z.string().trim().max(40).optional(),
    sourceIds: z.array(z.enum(["ofac_sanctions_lists", "trm_sanctions_docs", "buyer_authorized_inventory"])).max(5).optional(),
  })
  .strict();

const rawEvmAddressPattern = /\b0x[a-fA-F0-9]{40}\b/;
const commitmentStringSchema = z
  .string()
  .trim()
  .min(20)
  .max(180)
  .regex(/^(sha256|hmac|hmac-sha256|commitment|merkle):[A-Za-z0-9:_-]{16,150}$/)
  .refine((value) => !rawEvmAddressPattern.test(value), "Raw wallet addresses are not accepted; submit a commitment instead.");

const complianceDecisionPreviewSchema = z
  .object({
    subjectCommitment: commitmentStringSchema,
    decision: z.enum(["pass", "deny", "review", "expired", "unknown"]).optional(),
    policyVersion: z.string().trim().min(1).max(80).optional(),
    sourceMerkleRoot: commitmentStringSchema.optional(),
    issuedAt: z.string().trim().max(40).optional(),
    expiresAt: z.string().trim().max(40).optional(),
    sourceIds: z.array(z.enum(["ofac_sanctions_lists", "trm_sanctions_docs"])).max(2).optional(),
  })
  .strict()
  .refine((value) => JSON.stringify(value).length <= 20_000, "Compliance decision previews must be under 20KB.");

const cyberExpertCaseStoreShape = {
  caseTitle: z.string().trim().min(1).max(120).optional(),
  inventory: z.unknown().optional(),
  cves: z.array(z.string().regex(/^CVE-\d{4}-\d{4,}$/i)).max(100).optional(),
  cryptoIncidents: z.array(cryptoIncidentInputSchema).max(50).optional(),
  complianceProofs: z.array(complianceProofInputSchema).max(50).optional(),
  notes: z.array(z.string().trim().max(500)).max(20).optional(),
};

const cyberExpertCaseStoreObject = z.object(cyberExpertCaseStoreShape);

const hasCyberExpertCaseInput = (value: z.infer<typeof cyberExpertCaseStoreObject>) =>
  Boolean(value.inventory) ||
  Boolean(value.cves?.length) ||
  Boolean(value.cryptoIncidents?.length) ||
  Boolean(value.complianceProofs?.length) ||
  Boolean(value.notes?.length);

const cyberExpertCaseStoreSchema = cyberExpertCaseStoreObject
  .strict()
  .refine((value) => JSON.stringify(value).length <= 200_000, "Case-store preview payload must be under 200KB.")
  .refine(hasCyberExpertCaseInput, "Provide inventory, cves, cryptoIncidents, complianceProofs, or notes.");

const cyberExpertCaseBriefSchema = z
  .object({
    ...cyberExpertCaseStoreShape,
    includePublicCveRefresh: z.boolean().optional(),
    includeLocalModel: z.boolean().optional(),
  })
  .strict()
  .refine((value) => JSON.stringify(value).length <= 200_000, "Case-brief payload must be under 200KB.")
  .refine(hasCyberExpertCaseInput, "Provide inventory, cves, cryptoIncidents, complianceProofs, or notes.");

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

const CYBER_CASE_BRIEF_ROUTE_QUOTE = {
  routeId: "cyber_expert_case_brief",
  productId: "cyber_expert_model_preview_pack",
  priceUsd: "1.2500",
  sourceIds: [
    "buyer_authorized_inventory",
    "cisa_kev",
    "nvd_cve",
    "first_epss",
    "osv",
    "crypto_incident_public_metadata",
    "defillama",
    "trm_sanctions_docs",
    "ofac_sanctions_lists",
  ],
};

const CYBER_OLLAMA_ROUTE_QUOTE = {
  routeId: "cyber_ollama_model_preview",
  productId: "cyber_expert_model_preview_pack",
  priceUsd: "1.0000",
  sourceIds: [
    "buyer_authorized_inventory",
    "cisa_kev",
    "nvd_cve",
    "first_epss",
    "osv",
    "crypto_incident_public_metadata",
    "trm_sanctions_docs",
    "ofac_sanctions_lists",
  ],
};

function routePreviewPaymentRequiredPayload(input: Parameters<typeof buildRoutePreviewQuote>[0], headers: Headers) {
  const quote = buildRoutePreviewQuote(input);
  if (hasValidSimulatedPayment(headers, quote)) return null;
  return {
    quote,
    body: paymentRequiredPayload(quote),
    headers: {
      "Payment-Required": paymentRequiredHeader(quote),
      "X-AOE-Work-Order": quote.workOrderId,
    },
  };
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
        banklessMcpManifest: "aoe.bankless_mcp.manifest.v1",
        banklessPodcastDigest: "aoe.bankless.podcast_digest.v1",
        defiReportInventory: "aoe.defi_report.public_inventory.v1",
        cryptoResearchThesis: "aoe.crypto_research_thesis.v1",
        cyberExpertHarness: CYBER_EXPERT_HARNESS_SCHEMA_ID,
        cyberExpertCaseBrief: CYBER_EXPERT_CASE_BRIEF_SCHEMA_ID,
        cyberExpertCaseBriefReport: "aoe.cyber_expert_case_brief.report.v1",
        cyberExpertCaseStore: CYBER_EXPERT_CASE_STORE_SCHEMA_ID,
        cyberExpertModelPreview: CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID,
        cyberExpertEvalReport: CYBER_EXPERT_EVAL_REPORT_SCHEMA_ID,
        cyberExpertProviderStatus: "aoe.cyber_expert_provider_status.v1",
        cyberWindowsOllamaStatus: CYBER_WINDOWS_OLLAMA_STATUS_SCHEMA_ID,
        cyberOllamaModelPreview: CYBER_OLLAMA_MODEL_PREVIEW_SCHEMA_ID,
        cyberPublicCveRefresh: CYBER_PUBLIC_CVE_REFRESH_SCHEMA_ID,
        complianceDecisionPreview: COMPLIANCE_DECISION_PREVIEW_SCHEMA_ID,
        zeroGProofReadiness: ZERO_G_PROOF_READINESS_SCHEMA_ID,
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
      banklessMcpManifest: "/v1/mcp/bankless/manifest",
      banklessPodcastDigest: "/v1/adapters/bankless/podcast/recent",
      defiReportInventory: "/v1/research/defi-report/inventory",
      cryptoResearchThesis: "/v1/streams/crypto-thesis/preview",
      cyberExpertHarness: "/v1/streams/cyber-expert-harness/blueprint",
      cyberExpertCaseBrief: "/v1/streams/cyber-expert/case-brief",
      cyberExpertCaseBriefReport: "/v1/streams/cyber-expert/case-brief/report",
      cyberExpertCaseStore: "/v1/streams/cyber-expert/case-store",
      cyberExpertModelPreview: "/v1/streams/cyber-expert/model-preview",
      cyberExpertEvalReport: "/v1/streams/cyber-expert/evals",
      cyberExpertProviderStatus: "/v1/streams/cyber-expert/provider-status",
      cyberWindowsOllamaStatus: "/v1/streams/cyber-expert/windows-ollama/status",
      cyberOllamaModelPreview: "/v1/streams/cyber-expert/windows-ollama/preview",
      cyberPublicCveRefresh: "/v1/streams/cyber-expert/public-cve-refresh",
      complianceDecisionPreview: "/v1/compliance/screening/decision-preview",
      zeroGProofReadiness: "/v1/hackathon/0g-proof",
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
        "/v1/mcp/bankless/manifest",
        "/v1/research/defi-report/inventory",
        "/v1/x402/status",
        "/v1/artifacts",
        "/v1/artifacts/:id/preview",
        "/v1/artifacts/:id/quote",
        "/v1/streams/market-context/live-proof",
        "/v1/streams/market-context/preview",
        "/v1/adapters/cyber/inventory-priority/report",
        "/v1/adapters/bankless/podcast/recent",
        "/v1/streams/crypto-thesis/preview",
        "/v1/streams/cyber-expert-harness/blueprint",
        "/v1/streams/cyber-expert/case-store",
        "/v1/streams/cyber-expert/model-preview",
        "/v1/streams/cyber-expert/evals",
        "/v1/streams/cyber-expert/provider-status",
        "/v1/streams/cyber-expert/windows-ollama/status",
        "/v1/streams/cyber-expert/public-cve-refresh",
        "/v1/compliance/screening/decision-preview",
        "/v1/hackathon/0g-proof",
        "/v1/adapters/opportunities/public-programs/preview",
      ],
      paidEndpoints: [
        "/v1/artifacts/:id/content",
        "/v1/streams/cyber-expert/case-brief when includePublicCveRefresh or includeLocalModel is requested",
        "/v1/streams/cyber-expert/case-brief/report when includePublicCveRefresh or includeLocalModel is requested",
        "/v1/streams/cyber-expert/windows-ollama/preview",
      ],
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

  app.get("/v1/mcp/bankless/manifest", (c) => c.json(buildBanklessMcpManifest()));

  app.get("/v1/research/defi-report/inventory", (c) => c.json(buildDefiReportInventory()));

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

  app.get("/v1/streams/cyber-expert/evals", (c) =>
    c.json({
      mode: "deterministic_eval_fixture_report",
      x402Stream: false,
      readOnly: true,
      sideEffects: "none",
      report: buildCyberExpertEvalReport(),
    }),
  );

  app.get("/v1/streams/cyber-expert/provider-status", (c) => {
    const evalReport = buildCyberExpertEvalReport();
    return c.json({
      schemaId: "aoe.cyber_expert_provider_status.v1",
      mode: "read_only_provider_gate_status",
      x402Stream: false,
      readOnly: true,
      sideEffects: "none",
      provider: resolveCyberModelProvider(process.env, evalReport.evidenceProof.evalSuiteHash),
      evalSuiteHash: evalReport.evidenceProof.evalSuiteHash,
      secretValuesEchoed: false,
      modelCallsMade: 0,
      localGpuUsed: false,
      paidApiUsed: false,
      caveats: [
        "Provider status reports gate posture only; it never echoes environment variable values.",
        "Windows/Ollama preview requires explicit enablement, eval pass acknowledgement, provider config, model name, and a separate chat-allowed switch.",
        "OpenAI and Vertex/vLLM providers remain blocked until reviewed adapter implementation.",
      ],
    });
  });

  app.get("/v1/streams/cyber-expert/windows-ollama/status", async (c) =>
    c.json({
      mode: "read_only_windows_ollama_status",
      x402Stream: false,
      readOnly: true,
      sideEffects: "none",
      report: await fetchCyberWindowsOllamaStatus(),
    }),
  );

  app.post("/v1/streams/cyber-expert/windows-ollama/preview", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = cyberExpertCaseStoreSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_cyber_ollama_model_preview_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    const paymentRequired = routePreviewPaymentRequiredPayload(CYBER_OLLAMA_ROUTE_QUOTE, c.req.raw.headers);
    if (paymentRequired) {
      return c.json(paymentRequired.body, 402, paymentRequired.headers);
    }

    return c.json({
      mode: "gated_windows_ollama_model_preview",
      x402Stream: true,
      x402ProductId: "cyber_expert_model_preview_pack",
      paidProductId: "cyber_expert_model_preview_pack",
      previewPriceUsd: "1.0000",
      readOnly: true,
      sideEffects: "local_model_inference_only",
      report: await buildCyberOllamaModelPreview(parsed.data, process.env, fetch, buildCyberExpertEvalReport().evidenceProof.evalSuiteHash),
    });
  });

  app.post("/v1/streams/cyber-expert/public-cve-refresh", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = cvePrioritySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_cyber_public_cve_refresh_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    return c.json({
      mode: "read_only_public_cve_refresh",
      x402Stream: false,
      readOnly: true,
      sideEffects: "public_cve_source_fetch_only",
      report: await fetchCyberPublicCveRefresh(parsed.data.cves),
    });
  });

  app.post("/v1/compliance/screening/decision-preview", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = complianceDecisionPreviewSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_compliance_decision_preview_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
          rawSubjectAccepted: false,
          rawWalletAddressAccepted: false,
          rawVendorPayloadAccepted: false,
        },
        400,
      );
    }

    return c.json({
      mode: "commitment_only_screening_decision_preview",
      x402Stream: true,
      x402ProductId: "cyber_expert_case_store_pack",
      paidProductId: "cyber_expert_case_store_pack",
      previewPriceUsd: "0.2500",
      readOnly: true,
      sideEffects: "none",
      report: buildComplianceDecisionPreview(parsed.data),
    });
  });

  app.get("/v1/hackathon/0g-proof", async (c) =>
    c.json({
      mode: "read_only_zero_g_proof_readiness",
      x402Stream: true,
      x402ProductId: "zero_g_hackathon_proof_pack",
      paidProductId: "zero_g_hackathon_proof_pack",
      previewPriceUsd: "0.1000",
      readOnly: true,
      sideEffects: "public_chain_receipt_fetch_only",
      report: await fetchZeroGProofReadiness(),
    }),
  );

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

  app.post("/v1/adapters/bankless/podcast/recent", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = banklessPodcastSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_bankless_podcast_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    try {
      const report = await fetchBanklessPodcastDigest({ ...parsed.data, timeoutMs: marketFetchTimeoutMs() });
      return c.json({
        mode: "read_only_public_podcast_metadata",
        x402Stream: true,
        x402ProductId: "crypto_research_thesis_pack",
        paidProductId: "crypto_research_thesis_pack",
        readOnly: true,
        sideEffects: "none",
        report,
      });
    } catch (error) {
      return c.json(
        {
          error: "source_adapter_failed",
          message: error instanceof Error ? error.message : "Unknown Bankless RSS adapter error",
        },
        502,
      );
    }
  });

  app.post("/v1/streams/crypto-thesis/preview", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = cryptoThesisSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_crypto_thesis_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    try {
      const report = await buildCryptoResearchThesisReport({ ...parsed.data, timeoutMs: marketFetchTimeoutMs() });
      return c.json({
        mode: "read_only_public_research",
        x402Stream: true,
        x402ProductId: "crypto_research_thesis_pack",
        paidProductId: "crypto_research_thesis_pack",
        previewPriceUsd: "1.5000",
        readOnly: true,
        sideEffects: "none",
        report,
      });
    } catch (error) {
      return c.json(
        {
          error: "source_adapter_failed",
          message: error instanceof Error ? error.message : "Unknown crypto thesis adapter error",
        },
        502,
      );
    }
  });

  app.post("/v1/streams/cyber-expert-harness/blueprint", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = cyberExpertHarnessSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_cyber_expert_harness_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    return c.json({
      mode: "defensive_agentic_blueprint",
      x402Stream: true,
      x402ProductId: "cyber_expert_harness_blueprint",
      paidProductId: "cyber_expert_harness_blueprint",
      previewPriceUsd: "0.7500",
      readOnly: true,
      sideEffects: "none",
      report: buildCyberExpertHarnessBlueprint(parsed.data),
    });
  });

  app.post("/v1/streams/cyber-expert/case-store", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = cyberExpertCaseStoreSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_cyber_expert_case_store_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    return c.json({
      mode: "read_only_case_store_preview",
      x402Stream: true,
      x402ProductId: "cyber_expert_case_store_pack",
      paidProductId: "cyber_expert_case_store_pack",
      previewPriceUsd: "0.7500",
      readOnly: true,
      sideEffects: "none",
      report: buildCyberExpertCaseStorePreview(parsed.data),
    });
  });

  app.post("/v1/streams/cyber-expert/case-brief", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = cyberExpertCaseBriefSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_cyber_expert_case_brief_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    const { includePublicCveRefresh, includeLocalModel, ...caseRequest } = parsed.data;
    const paidLaneRequested = includePublicCveRefresh !== false || includeLocalModel === true;
    if (paidLaneRequested) {
      const paymentRequired = routePreviewPaymentRequiredPayload(CYBER_CASE_BRIEF_ROUTE_QUOTE, c.req.raw.headers);
      if (paymentRequired) {
        return c.json(
          {
            ...paymentRequired.body,
            publicFallback: {
              route: "/v1/streams/cyber-expert/case-brief",
              method: "POST",
              body: { includePublicCveRefresh: false, includeLocalModel: false },
              note: "Deterministic-only case briefs remain public; public source refresh and local model advisory lanes require simulated x402 access.",
            },
          },
          402,
          paymentRequired.headers,
        );
      }
    }
    return c.json({
      mode: "defensive_case_brief",
      x402Stream: true,
      x402ProductId: "cyber_expert_model_preview_pack",
      paidProductId: "cyber_expert_model_preview_pack",
      previewPriceUsd: "1.2500",
      readOnly: true,
      sideEffects: "deterministic_analysis_plus_optional_public_fetch_and_optional_local_inference",
      report: await buildCyberExpertCaseBrief(caseRequest, {
        includePublicCveRefresh,
        includeLocalModel,
        env: process.env,
        fetcher: fetch,
        currentEvalSuiteHash: buildCyberExpertEvalReport().evidenceProof.evalSuiteHash,
      }),
    });
  });

  app.post("/v1/streams/cyber-expert/case-brief/report", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = cyberExpertCaseBriefSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_cyber_expert_case_brief_report_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    const { includePublicCveRefresh, includeLocalModel, ...caseRequest } = parsed.data;
    const paidLaneRequested = includePublicCveRefresh !== false || includeLocalModel === true;
    if (paidLaneRequested) {
      const paymentRequired = routePreviewPaymentRequiredPayload(CYBER_CASE_BRIEF_ROUTE_QUOTE, c.req.raw.headers);
      if (paymentRequired) {
        return c.json(
          {
            ...paymentRequired.body,
            publicFallback: {
              route: "/v1/streams/cyber-expert/case-brief/report",
              method: "POST",
              body: { includePublicCveRefresh: false, includeLocalModel: false },
              note: "Deterministic-only case brief reports remain public; public source refresh and local model advisory lanes require simulated x402 access.",
            },
          },
          402,
          paymentRequired.headers,
        );
      }
    }

    const report = await buildCyberExpertCaseBrief(caseRequest, {
      includePublicCveRefresh,
      includeLocalModel,
      env: process.env,
      fetcher: fetch,
      currentEvalSuiteHash: buildCyberExpertEvalReport().evidenceProof.evalSuiteHash,
    });
    return c.json({
      schemaId: "aoe.cyber_expert_case_brief.report.v1",
      mode: "defensive_case_brief_html_report",
      x402Stream: true,
      x402ProductId: "cyber_expert_model_preview_pack",
      paidProductId: "cyber_expert_model_preview_pack",
      previewPriceUsd: "1.2500",
      contentType: "text/html",
      readOnly: true,
      sideEffects: "deterministic_analysis_plus_optional_public_fetch_and_optional_local_inference",
      report,
      reportHtml: renderCyberExpertCaseBriefHtml(report),
      outputPolicy: report.safety.outputPolicy,
    });
  });

  app.post("/v1/streams/cyber-expert/model-preview", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const parsed = cyberExpertCaseStoreSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "invalid_cyber_expert_model_preview_payload",
          issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        400,
      );
    }

    return c.json({
      mode: "deterministic_model_contract_preview",
      x402Stream: true,
      x402ProductId: "cyber_expert_model_preview_pack",
      paidProductId: "cyber_expert_model_preview_pack",
      previewPriceUsd: "1.0000",
      readOnly: true,
      sideEffects: "none",
      report: buildCyberExpertModelPreview(parsed.data),
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
