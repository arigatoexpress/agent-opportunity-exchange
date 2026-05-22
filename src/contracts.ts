import { artifacts, productRoutes, products, separateWorkstreams, sources, streams } from "./catalog.js";
import { PREVIEW_SAFETY_SCHEMA_ID } from "./preview-safety.js";
import { buildReadiness } from "./readiness.js";
import { getX402PaymentStatus } from "./x402-config.js";

type JsonSchema = Record<string, unknown>;

export const CONTRACT_BUNDLE_SCHEMA_ID = "aoe.contract_bundle.v1";

const CONTRACT_BUNDLE_VERSION = "2026-05-10";

function objectSchema(title: string, properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title,
    type: "object",
    additionalProperties: true,
    properties,
    ...(required.length ? { required } : {}),
  };
}

function arrayOf(items: JsonSchema): JsonSchema {
  return { type: "array", items };
}

function stringEnum(values: string[]): JsonSchema {
  return { type: "string", enum: values };
}

const rightsEnvelopeSchema = objectSchema(
  "Rights envelope",
  {
    licenseId: { type: "string" },
    allowedUses: arrayOf({ type: "string" }),
    prohibitedUses: arrayOf({ type: "string" }),
    cacheTtlSeconds: { type: "integer", minimum: 0 },
    maxExtract: { type: "string" },
    attribution: { type: "string" },
    privacyClass: { type: "string" },
    redistribution: { type: "string" },
  },
  ["licenseId", "allowedUses", "prohibitedUses", "redistribution"],
);

const sourceFreshnessSchema = objectSchema("Source freshness SLA", {
  cadence: { type: "string" },
  ttlSeconds: { type: "integer", minimum: 0 },
  lastVerified: { type: "string" },
  expectedRefresh: { type: "string" },
  caveats: arrayOf({ type: "string" }),
});

const sourceRecordSchema = objectSchema(
  "Source record",
  {
    sourceId: { type: "string" },
    name: { type: "string" },
    owner: { type: "string" },
    url: { type: "string" },
    accessPattern: stringEnum(["official_api", "official_download", "open_data", "public_docs", "public_rss", "optional_mcp_server", "partner_api"]),
    cadence: { type: "string" },
    risk: stringEnum(["green", "yellow", "red"]),
    rights: rightsEnvelopeSchema,
    notes: { type: "string" },
  },
  ["sourceId", "name", "owner", "url", "accessPattern", "risk", "rights"],
);

const productSchema = objectSchema(
  "Product contract",
  {
    productId: { type: "string" },
    schemaId: { type: "string", pattern: "^aoe\\.product\\.[a-z0-9_]+\\.v1$" },
    contractVersion: { const: "v1" },
    x402Stream: { const: true },
    title: { type: "string" },
    route: { type: "string" },
    method: stringEnum(["GET", "POST"]),
    category: { type: "string" },
    priceUsd: { type: "string" },
    settlementMode: { const: "simulated_or_testnet" },
    liveSettlementAllowed: { const: false },
    externalSideEffectsAllowed: { const: false },
    tags: arrayOf({ type: "string" }),
    sourceIds: arrayOf({ type: "string" }),
    buyerValue: { type: "string" },
    quality: objectSchema("Product quality metadata", {
      qualityTier: { const: "sellable_mvp" },
      contractCompleteness: { type: "string" },
      evidenceDepth: { type: "string" },
      sourceFreshnessSla: sourceFreshnessSchema,
      buyerValueMetrics: arrayOf(objectSchema("Buyer value metric", {})),
      auditSignals: arrayOf({ type: "string" }),
    }),
    disclaimers: arrayOf({ type: "string" }),
  },
  ["productId", "schemaId", "x402Stream", "priceUsd", "settlementMode", "liveSettlementAllowed", "externalSideEffectsAllowed", "sourceIds"],
);

const routeDiscoverySchema = objectSchema(
  "Route discovery",
  {
    routeId: { type: "string" },
    route: { type: "string" },
    method: stringEnum(["GET", "POST"]),
    schemaId: { type: "string" },
    x402Stream: { type: "boolean" },
    productIds: arrayOf({ type: "string" }),
    workstreamIds: arrayOf({ type: "string" }),
    access: stringEnum(["public", "simulated_x402_payment"]),
    readiness: stringEnum(["live_read_only", "simulated_payment_required", "separate_read_only_lane", "key_required"]),
    sourceIds: arrayOf({ type: "string" }),
    value: { type: "string" },
    freshnessSla: sourceFreshnessSchema,
    caveats: arrayOf({ type: "string" }),
  },
  ["routeId", "route", "method", "schemaId", "x402Stream", "access", "readiness", "sourceIds", "caveats"],
);

const historicalClaimsPolicySchema = objectSchema(
  "Historical claims policy",
  {
    revisionAware: { type: "boolean" },
    liveMacroReadMode: { type: "string" },
    productionHistoricalClaimsRequire: { type: "string" },
    notes: arrayOf({ type: "string" }),
  },
  ["revisionAware", "liveMacroReadMode", "productionHistoricalClaimsRequire", "notes"],
);

const liveMarketUpstreamSourceSchema = objectSchema(
  "Live market upstream source proof",
  {
    sourceId: stringEnum(["sec_edgar", "fred_alfred"]),
    status: stringEnum(["ok", "empty", "degraded"]),
    retrievalMode: { type: "string" },
    sourceUrls: arrayOf({ type: "string" }),
    observedRecords: { type: "integer", minimum: 0 },
    latestRecordDate: { type: ["string", "null"] },
    evidenceHashCount: { type: "integer", minimum: 0 },
  },
  ["sourceId", "status", "retrievalMode", "sourceUrls", "observedRecords", "latestRecordDate", "evidenceHashCount"],
);

const liveMarketEvidenceProofSchema = objectSchema(
  "Live market evidence proof",
  {
    algorithm: { const: "sha256" },
    canonicalization: { const: "stable-json-sorted-keys-v1" },
    reportHash: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
    filingRecordHashes: arrayOf({ type: "string", pattern: "^sha256:[a-f0-9]{64}$" }),
    macroSeriesRecordHashes: arrayOf({ type: "string", pattern: "^sha256:[a-f0-9]{64}$" }),
    macroObservationRecordHashes: arrayOf({ type: "string", pattern: "^sha256:[a-f0-9]{64}$" }),
  },
  ["algorithm", "canonicalization", "reportHash", "filingRecordHashes", "macroSeriesRecordHashes", "macroObservationRecordHashes"],
);

const liveMarketSourceEvidenceSchema = objectSchema(
  "Live market source evidence",
  {
    sourceId: stringEnum(["sec_edgar", "fred_alfred"]),
    retrievalMode: { type: "string" },
    sourceUrls: arrayOf({ type: "string" }),
    recordHashes: arrayOf({ type: "string", pattern: "^sha256:[a-f0-9]{64}$" }),
  },
  ["sourceId", "retrievalMode", "sourceUrls", "recordHashes"],
);

const liveMarketBoundariesSchema = objectSchema(
  "Live market boundaries",
  {
    researchOnly: { const: true },
    investmentAdvice: { const: false },
    tradeExecution: { const: false },
    personalizedPortfolioAdvice: { const: false },
    liveSettlementAllowed: { const: false },
    externalSideEffectsAllowed: { const: false },
  },
  [
    "researchOnly",
    "investmentAdvice",
    "tradeExecution",
    "personalizedPortfolioAdvice",
    "liveSettlementAllowed",
    "externalSideEffectsAllowed",
  ],
);

const streamDefinitionSchema = objectSchema(
  "Stream definition",
  {
    streamId: { type: "string" },
    productId: { type: "string" },
    x402Stream: { const: true },
    title: { type: "string" },
    route: { type: "string" },
    method: stringEnum(["GET", "POST"]),
    previewPriceUsd: { type: "string" },
    schemaVersion: { type: "string" },
    settlementMode: { const: "simulated_or_testnet" },
    liveSettlementAllowed: { const: false },
    externalSideEffectsAllowed: { const: false },
    sourceIds: arrayOf({ type: "string" }),
    tags: arrayOf({ type: "string" }),
    inputSchema: objectSchema("Stream input schema", {}),
    outputSummary: { type: "string" },
    historicalClaimsPolicy: historicalClaimsPolicySchema,
    caveats: arrayOf({ type: "string" }),
  },
  [
    "streamId",
    "productId",
    "x402Stream",
    "route",
    "method",
    "schemaVersion",
    "settlementMode",
    "liveSettlementAllowed",
    "externalSideEffectsAllowed",
    "sourceIds",
    "outputSummary",
    "caveats",
  ],
);

const quoteSchema = objectSchema(
  "x402 quote",
  {
    quoteId: { type: "string" },
    workOrderId: { type: "string" },
    artifactId: { type: "string" },
    productId: { type: "string" },
    priceUsd: { type: "string" },
    currency: { const: "USDC" },
    paymentProtocol: { const: "x402" },
    settlementMode: { const: "simulated_or_testnet" },
    liveSettlementAllowed: { const: false },
    expiresAt: { type: "string" },
    accepted: arrayOf(objectSchema("Accepted payment rail", {})),
    rights: rightsEnvelopeSchema,
    sourceIds: arrayOf({ type: "string" }),
  },
  ["quoteId", "workOrderId", "artifactId", "productId", "priceUsd", "paymentProtocol", "liveSettlementAllowed", "sourceIds"],
);

const quoteAccessSchema = objectSchema(
  "Artifact quote access plan",
  {
    preflightEndpoint: { const: "/v1/access/preflight" },
    paidContentEndpoint: { type: "string" },
    paymentHeader: { const: "X-AOE-Payment" },
    simulatedPaymentFormat: { const: "simulated:<workOrderId>" },
    contentUnlockMode: { const: "simulated_header_or_base_sepolia_testnet" },
    liveSettlementAllowed: { const: false },
    externalSideEffectsAllowed: { const: false },
    mainnetFundsAccepted: { const: false },
  },
  [
    "preflightEndpoint",
    "paidContentEndpoint",
    "paymentHeader",
    "simulatedPaymentFormat",
    "contentUnlockMode",
    "liveSettlementAllowed",
    "externalSideEffectsAllowed",
    "mainnetFundsAccepted",
  ],
);

const previewSchema = objectSchema("Artifact preview", {
  artifactId: { type: "string" },
  title: { type: "string" },
  description: { type: "string" },
  x402Stream: { const: true },
  tags: arrayOf({ type: "string" }),
  sourceIds: arrayOf({ type: "string" }),
  rights: rightsEnvelopeSchema,
  preview: objectSchema("Preview body", {}),
});

const contentSchema = objectSchema("Paid artifact content", {
  artifactId: { type: "string" },
  productId: { type: "string" },
  title: { type: "string" },
  category: { type: "string" },
  content: objectSchema("Derived artifact content", {}),
  rights: rightsEnvelopeSchema,
  productDisclaimers: arrayOf({ type: "string" }),
  receipt: objectSchema("Non-secret receipt", {
    receiptId: { type: "string" },
    quoteId: { type: "string" },
    workOrderId: { type: "string" },
    artifactHash: { type: "string", pattern: "^sha256:" },
    liveSettlementAllowed: { const: false },
  }),
  ledger: objectSchema("Ledger write", {
    written: {},
    containsSecrets: { const: false },
  }),
});

const paymentRequiredSchema = objectSchema("Payment required", {
  error: { const: "payment_required" },
  protocol: { const: "x402" },
  mode: stringEnum(["simulated", "x402_testnet"]),
  activeRail: { type: "string" },
  liveSettlementAllowed: { const: false },
  workOrderId: { type: "string" },
  quote: quoteSchema,
  instructions: arrayOf({ type: "string" }),
});

export function buildSchemaCatalog(): Record<string, JsonSchema> {
  const routeSchemaIds = Object.fromEntries(productRoutes.map((route) => [route.schemaId, objectSchema(`${route.routeId} response`, {})]));
  const productSchemaIds = Object.fromEntries(products.map((product) => [product.schemaId, productSchema]));

  return {
    [CONTRACT_BUNDLE_SCHEMA_ID]: objectSchema(
      "Agent Opportunity Exchange contract bundle",
      {
        schemaId: { const: CONTRACT_BUNDLE_SCHEMA_ID },
        bundleVersion: { const: CONTRACT_BUNDLE_VERSION },
        liveSettlementAllowed: { const: false },
        externalSideEffectsAllowed: { const: false },
        openapi: objectSchema("OpenAPI 3.1 contract", {}),
        schemaCatalog: objectSchema("JSON Schema catalog", {}),
      },
      ["schemaId", "bundleVersion", "liveSettlementAllowed", "externalSideEffectsAllowed", "openapi", "schemaCatalog"],
    ),
    ...routeSchemaIds,
    "aoe.discovery.products.v1": objectSchema("Products response", {
      schemaId: { const: "aoe.discovery.products.v1" },
      products: arrayOf(productSchema),
    }),
    "aoe.discovery.routes.v1": objectSchema("Routes response", {
      schemaId: { const: "aoe.discovery.routes.v1" },
      routes: arrayOf(routeDiscoverySchema),
    }),
    "aoe.buyer_proof.v1": objectSchema("Buyer proof response", {
      schemaId: { const: "aoe.buyer_proof.v1" },
      generatedAt: { type: "string" },
      headline: { type: "string" },
      counts: objectSchema("Buyer proof counts", {}),
      sellability: objectSchema("Sellability summary", {}),
      featuredProof: arrayOf(objectSchema("Featured proof route", {})),
      buyerValue: arrayOf({ type: "string" }),
      readiness: objectSchema("Readiness summary", {}),
      safety: objectSchema("Hard safety posture", {}),
    }),
    "aoe.demo_guide.v1": objectSchema("Demo guide response", {
      schemaId: { const: "aoe.demo_guide.v1" },
      title: { type: "string" },
      recommendedBaseUrl: { type: "string" },
      oneLine: { type: "string" },
      videoFlow: arrayOf(objectSchema("Demo step", {})),
      curlExamples: arrayOf({ type: "string" }),
      say: arrayOf({ type: "string" }),
      avoidClaims: arrayOf({ type: "string" }),
      safety: objectSchema("Demo safety posture", {
        liveSettlementAllowed: { const: false },
        externalSideEffectsAllowed: { const: false },
      }),
    }),
    [PREVIEW_SAFETY_SCHEMA_ID]: objectSchema("Preview safety response", {
      schemaId: { const: PREVIEW_SAFETY_SCHEMA_ID },
      generatedAt: { type: "string" },
      service: { const: "agent-opportunity-exchange" },
      recommendedBaseUrl: { type: "string" },
      previewReadyClaim: { type: "string" },
      safety: objectSchema("Preview safety disabled live-action flags", {
        liveSettlementAllowed: { const: false },
        mainnetFundsAccepted: { const: false },
        externalSideEffectsAllowed: { const: false },
        liveTradingAllowed: { const: false },
        outboundTelegramSendsAllowed: { const: false },
        customerDataRequired: { const: false },
        secretValuesRequiredInRepo: { const: false },
      }),
      localVerification: arrayOf({ type: "string" }),
      deployedPreviewVerification: objectSchema("Deployed preview smoke contract", {
        command: { const: "AOE_BROWSER_SMOKE_BASE_URL=<preview-url> npm run browser:smoke" },
        requiresHttps: { const: true },
        startsLocalServer: { const: false },
        proves: arrayOf({ type: "string" }),
      }),
      requiredEndpoints: arrayOf({ type: "string" }),
      blockedClaims: arrayOf({ type: "string" }),
    }),
    "aoe.discovery.sources.v1": objectSchema("Sources response", {
      sources: arrayOf(sourceRecordSchema),
    }),
    "aoe.discovery.artifacts.v1": objectSchema("Artifacts response", {
      artifacts: arrayOf(
        objectSchema("Artifact index row", {
          artifactId: { type: "string" },
          productId: { type: "string" },
          x402Stream: { const: true },
          sourceIds: arrayOf({ type: "string" }),
          preview: objectSchema("Preview summary", {}),
        }),
      ),
    }),
    "aoe.artifact.preview.v1": previewSchema,
    "aoe.artifact.quote.v1": objectSchema(
      "Artifact quote response",
      {
        schemaId: { const: "aoe.artifact.quote.v1" },
        quote: quoteSchema,
        productContract: productSchema,
        access: quoteAccessSchema,
      },
      ["schemaId", "quote", "productContract", "access"],
    ),
    "aoe.artifact.content.v1": contentSchema,
    "aoe.payment.required.v1": paymentRequiredSchema,
    "aoe.access.preflight.v1": objectSchema("Access preflight response", {
      allowed: { type: "boolean" },
      reason: { type: "string" },
      quote: quoteSchema,
      productContract: productSchema,
      liveSettlementAllowed: { const: false },
      externalSideEffectsAllowed: { const: false },
    }),
    "aoe.readiness.v1": objectSchema("Readiness response", {
      schemaId: { const: "aoe.readiness.v1" },
      generatedAt: { type: "string" },
      liveSettlementAllowed: { const: false },
      externalSideEffectsAllowed: { const: false },
      adapters: arrayOf(objectSchema("Adapter readiness", {})),
      contracts: objectSchema("Contract coverage", {}),
      counts: objectSchema("Adapter counts", {}),
    }),
    "aoe.x402.status.v1": objectSchema("x402 status response", {
      schemaId: { const: "aoe.x402.status.v1" },
      protocol: { const: "x402" },
      mode: stringEnum(["simulated", "x402_testnet"]),
      activeRail: stringEnum(["simulated_header", "official_x402_testnet", "x402_testnet_config_required"]),
      ready: { type: "boolean" },
      liveSettlementAllowed: { const: false },
      serverPrivateKeyRequired: { const: false },
      network: objectSchema("Payment network", {
        id: { const: "eip155:84532" },
        label: { const: "Base Sepolia" },
        testnet: { const: true },
        mainnet: { const: false },
      }),
    }),
    "aoe.streams.discovery.v1": objectSchema("Streams response", { streams: arrayOf(streamDefinitionSchema) }),
    "aoe.workstreams.discovery.v1": objectSchema("Separate workstreams response", { workstreams: arrayOf(objectSchema("Workstream", {})) }),
    ...productSchemaIds,
    "aoe.telegram.status.v1": objectSchema("Telegram Mini App status response", {
      schemaId: { const: "aoe.telegram.status.v1" },
      generatedAt: { type: "string" },
      integrationId: { const: "telegram_mini_app_opt_in" },
      status: stringEnum(["configured_for_verified_init_data", "bot_token_required"]),
      telegramSurface: { const: "Mini App / Web App" },
      tokenConfigured: { type: "boolean" },
      initDataVerificationRequired: { const: true },
      outboundTelegramSendsAllowed: { const: false },
      webhookRegistrationAllowed: { const: false },
      messagesSent: { const: 0 },
      liveSettlementAllowed: { const: false },
      externalSideEffectsAllowed: { const: false },
      endpoints: objectSchema("Telegram endpoints", {}),
      docs: objectSchema("Telegram docs references", {}),
      caveats: arrayOf({ type: "string" }),
    }),
    "aoe.telegram.registration.v1": objectSchema("Telegram Mini App registration response", {
      schemaId: { const: "aoe.telegram.registration.v1" },
      registered: { type: "boolean" },
      mode: { type: "string" },
      registrationId: { type: "string" },
      generatedAt: { type: "string" },
      telegramUserHash: { type: "string", pattern: "^sha256:" },
      userPreview: objectSchema("Non-secret Telegram user preview", {}),
      auth: objectSchema("Telegram initData verification metadata", {
        verifiedWithBotToken: { const: true },
        rawInitDataEchoed: { const: false },
      }),
      optIn: objectSchema("Telegram opt-in preferences", {}),
      storage: objectSchema("Registration storage posture", {}),
      outboundTelegramSendsAllowed: { const: false },
      webhookRegistrationAllowed: { const: false },
      messagesSent: { const: 0 },
      liveSettlementAllowed: { const: false },
      externalSideEffectsAllowed: { const: false },
      nextSteps: arrayOf({ type: "string" }),
    }),
    "aoe.adapter.cyber_vuln_priority.preview.v1": objectSchema("Cyber vulnerability priority preview", {
      mode: { const: "read_only_public_preview" },
      x402Stream: { const: true },
      report: objectSchema("Defensive CVE priority report", {}),
    }),
    "sapphirealpha.cyber_inventory_priority.preview.v1": objectSchema("Cyber inventory priority preview", {
      mode: { const: "read_only_public_preview" },
      x402Stream: { const: true },
      sideEffects: { const: "none" },
      report: objectSchema("Authorized inventory priority report", {}),
    }),
    "aoe.adapter.cyber_inventory_priority.report.v1": objectSchema("Cyber inventory priority HTML report", {
      schemaId: { const: "aoe.adapter.cyber_inventory_priority.report.v1" },
      mode: { const: "read_only_public_preview" },
      x402Stream: { const: true },
      contentType: { const: "text/html" },
      sideEffects: { const: "none" },
      report: objectSchema("Authorized inventory priority report", {}),
      reportHtml: { type: "string" },
      outputPolicy: arrayOf({ type: "string" }),
    }),
    "aoe.cyber_expert_case_store.preview.v1": objectSchema("Cyber expert case-store preview", {
      mode: { const: "read_only_case_store_preview" },
      x402Stream: { const: true },
      sideEffects: { const: "none" },
      report: objectSchema("RAG-ready cyber case store", {
        schemaId: { const: "aoe.cyber_expert_case_store.preview.v1" },
        case: objectSchema("Private case metadata", {}),
        inputSummary: objectSchema("Input summary", {}),
        evidenceRecords: arrayOf(objectSchema("Evidence record", {})),
        ragDocuments: arrayOf(objectSchema("RAG document", {})),
        retrievalPlan: arrayOf(objectSchema("Retrieval plan item", {})),
        safety: objectSchema("Case-store safety posture", {
          readOnly: { const: true },
          sideEffects: { const: "none" },
          liveSettlementAllowed: { const: false },
          activeScanningAllowed: { const: false },
          exploitPayloadGenerationAllowed: { const: false },
          rawWalletAddressEchoAllowed: { const: false },
          privateHostnamesEchoAllowed: { const: false },
        }),
        evidenceProof: objectSchema("Case-store evidence proof", {}),
      }),
    }),
    "aoe.cyber_expert_model_preview.v1": objectSchema("Cyber expert model preview", {
      mode: { const: "deterministic_model_contract_preview" },
      x402Stream: { const: true },
      sideEffects: { const: "none" },
      report: objectSchema("Deterministic cyber expert model response contract", {
        schemaId: { const: "aoe.cyber_expert_model_preview.v1" },
        modelRuntime: objectSchema("Model runtime posture", {
          provider: { const: "rules_only_no_model_call" },
          modelCallsMade: { const: 0 },
          localGpuUsed: { const: false },
          paidApiUsed: { const: false },
        }),
        executiveSummary: arrayOf({ type: "string" }),
        priorityQueue: arrayOf(objectSchema("Priority queue item", {})),
        humanReviewQueue: arrayOf({ type: "string" }),
        blockedActions: arrayOf({ type: "string" }),
        sourceCoverage: arrayOf(objectSchema("Source coverage row", {})),
        safety: objectSchema("Model preview safety posture", {
          readOnly: { const: true },
          sideEffects: { const: "none" },
          liveSettlementAllowed: { const: false },
          activeScanningAllowed: { const: false },
          exploitPayloadGenerationAllowed: { const: false },
          modelOutputAuthoritative: { const: false },
        }),
        evidenceProof: objectSchema("Model preview evidence proof", {}),
      }),
    }),
    "aoe.cyber_expert_case_brief.v1": objectSchema("Cyber expert case brief", {
      mode: { const: "defensive_case_brief" },
      x402Stream: { const: true },
      readOnly: { const: true },
      sideEffects: { const: "deterministic_analysis_plus_optional_public_fetch_and_optional_local_inference" },
      report: objectSchema("Operator-facing defensive cyber case brief", {
        schemaId: { const: "aoe.cyber_expert_case_brief.v1" },
        case: objectSchema("Private case metadata", {}),
        deterministicPreview: objectSchema("Deterministic cyber expert model response contract", {}),
        publicCveRefresh: objectSchema("Optional public CVE freshness report", {}),
        localModelPreview: objectSchema("Optional local model advisory report", {}),
        operatorDecision: objectSchema("Human-review decision support", {
          posture: stringEnum(["ready_for_human_review", "needs_more_source_refresh", "needs_authorized_inventory", "blocked_sensitive_output"]),
          humanReviewRequired: { const: true },
          recommendedActions: arrayOf({ type: "string" }),
          blockedActions: arrayOf({ type: "string" }),
        }),
        safety: objectSchema("Case brief safety posture", {
          readOnly: { const: true },
          privateDataSentToPublicSources: { const: false },
          activeScanningAllowed: { const: false },
          exploitPayloadGenerationAllowed: { const: false },
          liveSettlementAllowed: { const: false },
          modelOutputAuthoritative: { const: false },
        }),
        evidenceProof: objectSchema("Case brief evidence proof", {}),
      }),
    }),
    "aoe.cyber_expert_case_brief.report.v1": objectSchema("Cyber expert case brief HTML report", {
      schemaId: { const: "aoe.cyber_expert_case_brief.report.v1" },
      mode: { const: "defensive_case_brief_html_report" },
      x402Stream: { const: true },
      readOnly: { const: true },
      contentType: { const: "text/html" },
      sideEffects: { const: "deterministic_analysis_plus_optional_public_fetch_and_optional_local_inference" },
      report: objectSchema("Operator-facing defensive cyber case brief", {}),
      reportHtml: { type: "string" },
      outputPolicy: arrayOf({ type: "string" }),
    }),
    "aoe.compliance_decision_preview.v1": objectSchema("Commitment-only compliance decision preview", {
      mode: { const: "commitment_only_screening_decision_preview" },
      x402Stream: { const: true },
      readOnly: { const: true },
      sideEffects: { const: "none" },
      report: objectSchema("Commitment-only screening decision proof", {
        schemaId: { const: "aoe.compliance_decision_preview.v1" },
        mode: { const: "commitment_only_screening_decision_preview" },
        productId: { const: "cyber_expert_case_store_pack" },
        sourceIds: arrayOf({ type: "string" }),
        decision: objectSchema("Decision metadata", {
          subjectCommitment: { type: "string" },
          privateScreeningRequired: { const: true },
          rawSubjectAccepted: { const: false },
          rawWalletAddressAccepted: { const: false },
          rawVendorPayloadAccepted: { const: false },
          publicProofStatus: { const: "commitment_only_not_sanctions_clearance" },
        }),
        safety: objectSchema("Compliance proof safety posture", {
          rawWalletAddressEchoAllowed: { const: false },
          rawVendorPayloadEchoAllowed: { const: false },
          liveTrmCallMade: { const: false },
          liveOfacScreeningCallMade: { const: false },
          onChainProofPosted: { const: false },
          sanctionsClearanceClaimed: { const: false },
          liveSettlementAllowed: { const: false },
          externalSideEffectsAllowed: { const: false },
        }),
        evidenceProof: objectSchema("Decision proof hashes", {}),
      }),
    }),
    "aoe.zero_g_proof_readiness.v1": objectSchema("0G proof readiness passport", {
      mode: { const: "read_only_zero_g_proof_readiness" },
      x402Stream: { const: true },
      readOnly: { const: true },
      sideEffects: { const: "public_chain_receipt_fetch_only" },
      report: objectSchema("0G hackathon proof passport", {
        schemaId: { const: "aoe.zero_g_proof_readiness.v1" },
        mode: { const: "read_only_zero_g_proof_readiness" },
        productId: { const: "zero_g_hackathon_proof_pack" },
        proofPacket: objectSchema("Static public 0G proof packet", {
          chainId: { const: 16661 },
          chainName: { const: "0G mainnet" },
          contractAddress: { type: "string" },
          anchorTxHash: { type: "string" },
          publicProofPage: { type: "string" },
        }),
        liveReadback: objectSchema("Read-only receipt readback", {
          attempted: { const: true },
          rpcMethod: { const: "eth_getTransactionReceipt" },
          status: stringEnum(["verified", "degraded", "not_found"]),
          receipt: objectSchema("Receipt summary", {}),
        }),
        readiness: objectSchema("0G proof readiness", {
          status: stringEnum(["verified_public_anchor", "degraded_static_proof_only", "anchor_receipt_missing"]),
          judgeDemoReady: { type: "boolean" },
        }),
        safety: objectSchema("0G proof safety posture", {
          walletSigningAllowed: { const: false },
          transactionBroadcastAllowed: { const: false },
          proofPostingAllowed: { const: false },
          nodeStartAttempted: { const: false },
          secretValuesEchoed: { const: false },
          rawWalletSubjectAccepted: { const: false },
          rawComplianceSubjectPublished: { const: false },
          liveSettlementAllowed: { const: false },
          externalSideEffectsAllowed: { const: false },
          sanctionsClearanceClaimed: { const: false },
        }),
        evidenceProof: objectSchema("0G proof hashes", {}),
      }),
    }),
    "aoe.cyber_expert_eval_report.v1": objectSchema("Cyber expert eval report", {
      mode: { const: "deterministic_eval_fixture_report" },
      x402Stream: { const: false },
      sideEffects: { const: "none" },
      report: objectSchema("Deterministic cyber expert eval report", {
        schemaId: { const: "aoe.cyber_expert_eval_report.v1" },
        targetSchemaId: { const: "aoe.cyber_expert_model_preview.v1" },
        caseCount: { type: "integer", minimum: 0 },
        passedCount: { type: "integer", minimum: 0 },
        failedCount: { type: "integer", minimum: 0 },
        passed: { type: "boolean" },
        cases: arrayOf(objectSchema("Eval case result", {})),
        evidenceProof: objectSchema("Eval report evidence proof", {}),
      }),
    }),
    "aoe.cyber_expert_provider_status.v1": objectSchema("Cyber expert provider status", {
      schemaId: { const: "aoe.cyber_expert_provider_status.v1" },
      mode: { const: "read_only_provider_gate_status" },
      x402Stream: { const: false },
      readOnly: { const: true },
      sideEffects: { const: "none" },
      provider: objectSchema("Resolved provider gate", {
        provider: { type: "string" },
        requestedProvider: { type: "string" },
        status: { type: "string" },
        modelCallsMade: { const: 0 },
        localGpuUsed: { const: false },
        paidApiUsed: { const: false },
      }),
      secretValuesEchoed: { const: false },
      modelCallsMade: { const: 0 },
      localGpuUsed: { const: false },
      paidApiUsed: { const: false },
      caveats: arrayOf({ type: "string" }),
    }),
    "aoe.cyber_ollama_model_preview.v1": objectSchema("Cyber Ollama model preview", {
      mode: { const: "gated_windows_ollama_model_preview" },
      x402Stream: { const: true },
      readOnly: { const: true },
      sideEffects: { const: "local_model_inference_only" },
      report: objectSchema("Gated local Windows Ollama advisory preview", {
        schemaId: { const: "aoe.cyber_ollama_model_preview.v1" },
        deterministicSchemaId: { const: "aoe.cyber_expert_model_preview.v1" },
        deterministicPreview: objectSchema("Deterministic cyber expert model response contract", {}),
        modelRuntime: objectSchema("Model runtime posture", {}),
        localModel: objectSchema("Local model call posture", {
          endpointEchoed: { const: false },
          modelNameEchoed: { const: false },
          rawPromptEchoed: { const: false },
          rawOutputEchoed: { const: false },
          paidApiUsed: { const: false },
        }),
        safety: objectSchema("Local model safety posture", {
          readOnly: { const: true },
          activeScanningAllowed: { const: false },
          exploitPayloadGenerationAllowed: { const: false },
          liveSettlementAllowed: { const: false },
          modelOutputAuthoritative: { const: false },
        }),
        evidenceProof: objectSchema("Local model evidence proof", {}),
      }),
    }),
    "aoe.cyber_windows_ollama_status.v1": objectSchema("Cyber Windows Ollama status", {
      mode: { const: "read_only_windows_ollama_status" },
      x402Stream: { const: false },
      readOnly: { const: true },
      sideEffects: { const: "none" },
      report: objectSchema("Windows Ollama status report", {
        schemaId: { const: "aoe.cyber_windows_ollama_status.v1" },
        configured: { type: "boolean" },
        status: stringEnum(["not_configured", "reachable", "degraded"]),
        endpointEchoed: { const: false },
        modelNamesEchoed: { const: false },
        modelCount: { type: "integer", minimum: 0 },
        calls: objectSchema("Ollama calls", {
          tagsEndpointCalled: { type: "boolean" },
          chatEndpointCalled: { const: false },
          generateEndpointCalled: { const: false },
          embeddingsEndpointCalled: { const: false },
        }),
        chatCallsAllowed: { const: false },
        localGpuUsed: { const: false },
        paidApiUsed: { const: false },
      }),
    }),
    "aoe.cyber_public_cve_refresh.v1": objectSchema("Cyber public CVE refresh", {
      mode: { const: "read_only_public_cve_refresh" },
      x402Stream: { const: false },
      readOnly: { const: true },
      sideEffects: { const: "public_cve_source_fetch_only" },
      report: objectSchema("Public CVE freshness report", {
        schemaId: { const: "aoe.cyber_public_cve_refresh.v1" },
        cves: arrayOf({ type: "string" }),
        sourceResults: arrayOf(objectSchema("Public CVE source result", {})),
        records: arrayOf(objectSchema("Public CVE evidence record", {})),
        safety: objectSchema("Public CVE refresh safety posture", {
          readOnly: { const: true },
          privateDataSent: { const: false },
          hostnamesSent: { const: false },
          activeScanningAllowed: { const: false },
          exploitPayloadGenerationAllowed: { const: false },
          rawSourceRedistribution: { const: false },
        }),
        evidenceProof: objectSchema("Public CVE refresh evidence proof", {}),
      }),
    }),
    "sapphirealpha.market_context.v1": objectSchema("Market context preview", {
      mode: { const: "read_only_public_preview" },
      x402Stream: { const: true },
      previewPriceUsd: { type: "string" },
      report: objectSchema("SEC plus macro evidence proof", {}),
    }),
    "aoe.market_live_upstream_proof.v1": objectSchema("Live market upstream proof", {
      schemaId: { const: "aoe.market_live_upstream_proof.v1" },
      generatedAt: { type: "string" },
      mode: { const: "read_only_live_source_probe" },
      x402Stream: { const: true },
      productId: { const: "market_regime_evidence_pack" },
      streamId: { const: "sec_macro_context" },
      mockDataUsed: { type: "boolean" },
      durationMs: { type: "integer", minimum: 0 },
      query: objectSchema("Live market query", {
        ticker: { type: "string" },
        seriesIds: arrayOf({ type: "string" }),
        filingForms: arrayOf({ type: "string" }),
        filingLimit: { type: "integer", minimum: 1 },
        seriesLimit: { type: "integer", minimum: 1 },
      }),
      overall: { type: "string", enum: ["pass", "warn", "fail"] },
      upstream: objectSchema(
        "SEC and FRED upstream proof",
        {
          sec_edgar: liveMarketUpstreamSourceSchema,
          fred_alfred: liveMarketUpstreamSourceSchema,
        },
        ["sec_edgar", "fred_alfred"],
      ),
      reportSummary: objectSchema("Evidence summary", {
        filingCount: { type: "integer", minimum: 0 },
        macroSeriesCount: { type: "integer", minimum: 0 },
        latestMacroObservations: arrayOf(
          objectSchema(
            "Latest macro observation",
            {
              seriesId: { type: "string" },
              sourceUrl: { type: "string" },
            },
            ["seriesId", "sourceUrl"],
          ),
        ),
        highlights: arrayOf(objectSchema("Highlight", {})),
        evidenceProof: liveMarketEvidenceProofSchema,
      }),
      sourceEvidence: arrayOf(liveMarketSourceEvidenceSchema),
      historicalClaimsPolicy: historicalClaimsPolicySchema,
      boundaries: liveMarketBoundariesSchema,
      caveats: arrayOf({ type: "string" }),
    }, [
      "schemaId",
      "generatedAt",
      "mode",
      "x402Stream",
      "productId",
      "streamId",
      "mockDataUsed",
      "durationMs",
      "query",
      "overall",
      "upstream",
      "reportSummary",
      "sourceEvidence",
      "historicalClaimsPolicy",
      "boundaries",
      "caveats",
    ]),
    "aoe.adapter.sec_filings.preview.v1": objectSchema("SEC filings preview", {
      mode: { const: "read_only_public_preview" },
      x402Stream: { const: true },
      report: objectSchema("SEC filings report", {}),
    }),
    "aoe.adapter.fred_series.preview.v1": objectSchema("FRED series preview", {
      mode: { const: "read_only_public_preview" },
      x402Stream: { const: true },
      report: objectSchema("FRED series report", {}),
    }),
    "aoe.adapter.opportunity_public_programs.preview.v1": objectSchema("Opportunity public programs preview", {
      mode: { const: "read_only_public_preview" },
      x402Stream: { const: true },
      x402ProductId: { const: "opportunity_intel_pack" },
      sideEffects: { const: "none" },
      report: objectSchema("Official public program metadata report", {
        schemaVersion: { const: "aoe.adapter.opportunity_public_programs.preview.v1" },
        productId: { const: "opportunity_intel_pack" },
        sources: arrayOf(objectSchema("Opportunity source status", {})),
        summary: objectSchema("Opportunity preview summary", {}),
        matches: arrayOf(objectSchema("Opportunity public program match", {})),
        outputPolicy: arrayOf({ type: "string" }),
      }),
    }),
    "aoe.workstream.wildfire_alerts.preview.v1": objectSchema("Wildfire alerts preview", {
      mode: { const: "read_only_public_preview" },
      x402Stream: { const: false },
      boundary: { const: "separate_from_x402_streams" },
      report: objectSchema("NWS alerts report", {}),
    }),
    "aoe.workstream.wfigs_perimeters.preview.v1": objectSchema("WFIGS perimeters preview", {
      mode: { const: "read_only_public_preview" },
      x402Stream: { const: false },
      boundary: { const: "separate_from_x402_streams" },
      report: objectSchema("WFIGS perimeter report", {}),
    }),
  };
}

export function buildContractBundle(now = new Date()) {
  const schemaCatalog = buildSchemaCatalog();
  const readiness = buildReadiness();
  const x402Status = getX402PaymentStatus();
  const pathContracts = productRoutes.map((route) => ({
    routeId: route.routeId,
    path: route.route,
    method: route.method,
    schemaId: route.schemaId,
    schemaRef: `#/schemaCatalog/${route.schemaId}`,
    access: route.access,
    readiness: route.readiness,
    x402Stream: route.x402Stream,
    productIds: route.productIds,
    workstreamIds: route.workstreamIds ?? [],
    sourceIds: route.sourceIds,
    liveSettlementAllowed: false,
    externalSideEffectsAllowed: false,
    caveats: route.caveats,
  }));

  return {
    schemaId: CONTRACT_BUNDLE_SCHEMA_ID,
    bundleVersion: CONTRACT_BUNDLE_VERSION,
    generatedAt: now.toISOString(),
    liveSettlementAllowed: false,
    externalSideEffectsAllowed: false,
    paymentBoundary: {
      protocol: "x402",
      modes: ["simulated", "x402_testnet"],
      activeRail: x402Status.activeRail,
      liveSettlementAllowed: false,
      mainnetAllowed: false,
      acceptedTestnet: x402Status.network.id,
      acceptedAsset: x402Status.acceptedAsset,
      rails: x402Status.rails,
      paySh: x402Status.paySh,
      serverPrivateKeyRequired: false,
      instructions: [
        "Simulated header access is the default buyer proof rail.",
        "Official x402 middleware is Base Sepolia testnet only when explicitly configured.",
        "Solana/Pay.sh support is a disabled quote/catalog candidate until an explicit testnet plan is approved.",
        "Do not send mainnet funds to demo or testnet payment addresses.",
      ],
    },
    rightsBoundary: {
      principle: "payment_is_not_permission",
      outputPolicy: "Sell derived analysis, metadata, links, freshness, provenance, and checklists; do not resell raw source payloads.",
      sourceCount: sources.length,
      greenSourceCount: sources.filter((source) => source.risk === "green").length,
      yellowSourceCount: sources.filter((source) => source.risk === "yellow").length,
      prohibited: ["raw source resale", "paywall bypass", "credential material", "unauthorized scans", "trading or money movement"],
    },
    coverage: {
      products: products.length,
      routes: productRoutes.length,
      sources: sources.length,
      artifacts: artifacts.length,
      streams: streams.length,
      separateWorkstreams: separateWorkstreams.length,
      buyerDiscoveryReady: readiness.contracts.buyerDiscoveryReady,
      routeSchemasCovered: productRoutes.every((route) => Boolean(schemaCatalog[route.schemaId])),
      productSchemasCovered: products.every((product) => Boolean(schemaCatalog[product.schemaId])),
    },
    pathContracts,
    schemaCatalog,
    openapi: buildOpenApiContract(schemaCatalog),
  };
}

function buildOpenApiContract(schemaCatalog: Record<string, JsonSchema>) {
  const paths = Object.fromEntries(
    [
      {
        routeId: "contract_bundle",
        route: "/v1/contracts",
        method: "GET" as const,
        schemaId: CONTRACT_BUNDLE_SCHEMA_ID,
        access: "public",
        readiness: "live_read_only",
        x402Stream: false,
        productIds: [],
        workstreamIds: [],
        sourceIds: [],
        value: "Exports the OpenAPI and JSON Schema bundle for buyers and agents.",
        caveats: ["Contract bundle is generated from the current in-repo registry at request time."],
      },
      ...productRoutes,
    ].map((route) => [
      openApiPath(route.route),
      {
        [route.method.toLowerCase()]: {
          operationId: route.routeId,
          summary: route.value,
          tags: route.x402Stream ? ["x402-buyer-contracts"] : ["public-discovery"],
          "x-aoe": {
            schemaId: route.schemaId,
            access: route.access,
            readiness: route.readiness,
            x402Stream: route.x402Stream,
            productIds: route.productIds,
            workstreamIds: route.workstreamIds ?? [],
            sourceIds: route.sourceIds,
            liveSettlementAllowed: false,
            externalSideEffectsAllowed: false,
            caveats: route.caveats,
          },
          responses: {
            "200": {
              description: "Successful public or buyer-authorized response.",
              content: { "application/json": { schema: { $ref: `#/components/schemas/${route.schemaId}` } } },
            },
            ...(route.access === "simulated_x402_payment"
              ? {
                  "402": {
                    description: "x402 payment required; simulated header or Base Sepolia testnet only.",
                    content: { "application/json": { schema: { $ref: "#/components/schemas/aoe.payment.required.v1" } } },
                  },
                }
              : {}),
          },
        },
      },
    ]),
  );

  return {
    openapi: "3.1.0",
    info: {
      title: "Agent Opportunity Exchange Buyer Contracts",
      version: CONTRACT_BUNDLE_VERSION,
      summary: "Public preview, quote, readiness, and simulated/testnet x402 contracts.",
    },
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    servers: [{ url: "/", description: "Current AOE service root" }],
    paths,
    components: {
      schemas: schemaCatalog,
    },
  };
}

function openApiPath(route: string): string {
  return route.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}
