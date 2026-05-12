import { artifacts, productRoutes, products, separateWorkstreams, sources, streams } from "./catalog.js";
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
    accessPattern: stringEnum(["official_api", "official_download", "open_data", "public_docs", "partner_api"]),
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
    "aoe.discovery.products.v1": objectSchema("Products response", {
      schemaId: { const: "aoe.discovery.products.v1" },
      products: arrayOf(productSchema),
    }),
    "aoe.discovery.routes.v1": objectSchema("Routes response", {
      schemaId: { const: "aoe.discovery.routes.v1" },
      routes: arrayOf(routeDiscoverySchema),
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
    "aoe.artifact.quote.v1": objectSchema("Artifact quote response", { quote: quoteSchema }, ["quote"]),
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
    ...routeSchemaIds,
    ...productSchemaIds,
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
