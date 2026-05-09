import { productRoutes, products } from "./catalog.js";

export interface AdapterReadiness {
  adapterId: string;
  productId: string | null;
  workstreamId?: string;
  x402Stream: boolean;
  sourceIds: string[];
  status: "live_read_only" | "configured_stub" | "key_required" | "blocked";
  endpoint: string | null;
  inputMode: string;
  sideEffects: "none";
  liveSettlementAllowed: false;
  notes: string[];
}

export function buildReadiness() {
  const adapters: AdapterReadiness[] = [
    {
      adapterId: "cyber_vuln_priority",
      productId: "cyber_exploited_vuln_priority",
      x402Stream: true,
      sourceIds: ["cisa_kev", "first_epss", "nvd_cve"],
      status: "live_read_only",
      endpoint: "/v1/adapters/cyber/vuln-priority/preview",
      inputMode: "CVE list, CSV inventory, or nested JSON inventory via CLI/API",
      sideEffects: "none",
      liveSettlementAllowed: false,
      notes: ["No active scanning.", "No exploit payloads.", "No credential material."],
    },
    {
      adapterId: "wildfire_nws_alerts",
      productId: null,
      workstreamId: "wildfire_drone_readiness_lane",
      x402Stream: false,
      sourceIds: ["nws_alerts"],
      status: "live_read_only",
      endpoint: "/v1/adapters/wildfire/alerts/preview",
      inputMode: "State area code or lat/lon point",
      sideEffects: "none",
      liveSettlementAllowed: false,
      notes: ["Not incident command.", "No alert sends.", "No drone authorization."],
    },
    {
      adapterId: "wildfire_wfigs_perimeters",
      productId: null,
      workstreamId: "wildfire_drone_readiness_lane",
      x402Stream: false,
      sourceIds: ["nifc_wfigs"],
      status: "live_read_only",
      endpoint: "/v1/adapters/wildfire/wfigs-perimeters/preview",
      inputMode: "Optional state code plus result limit",
      sideEffects: "none",
      liveSettlementAllowed: false,
      notes: ["Public NIFC/WFIGS ArcGIS service.", "Perimeters are not available for every incident.", "Not evacuation authority."],
    },
    {
      adapterId: "market_sec_macro_context",
      productId: "market_regime_evidence_pack",
      x402Stream: true,
      sourceIds: ["sec_edgar", "fred_alfred"],
      status: "live_read_only",
      endpoint: "/v1/streams/market-context/preview",
      inputMode: "Ticker plus optional FRED series ids",
      sideEffects: "none",
      liveSettlementAllowed: false,
      notes: ["Featured storefront stream.", "SEC filings plus macro context.", "No investment advice or trade execution."],
    },
    {
      adapterId: "markets_sec_filings",
      productId: "market_regime_evidence_pack",
      x402Stream: true,
      sourceIds: ["sec_edgar"],
      status: "live_read_only",
      endpoint: "/v1/adapters/markets/sec-filings/preview",
      inputMode: "Ticker or CIK plus optional form filters",
      sideEffects: "none",
      liveSettlementAllowed: false,
      notes: ["Document intelligence only.", "No investment advice.", "No trade execution."],
    },
    {
      adapterId: "markets_fred_series",
      productId: "market_regime_evidence_pack",
      x402Stream: true,
      sourceIds: ["fred_alfred"],
      status: "live_read_only",
      endpoint: "/v1/adapters/markets/fred-series/preview",
      inputMode: "FRED series ids",
      sideEffects: "none",
      liveSettlementAllowed: false,
      notes: ["Public graph CSV preview.", "Use ALFRED vintages for production revision-aware research.", "No trading signal."],
    },
    {
      adapterId: "wildfire_nasa_firms",
      productId: null,
      workstreamId: "wildfire_drone_readiness_lane",
      x402Stream: false,
      sourceIds: ["nasa_firms"],
      status: process.env.NASA_FIRMS_MAP_KEY ? "configured_stub" : "key_required",
      endpoint: null,
      inputMode: "Future AOI bounding box or country query",
      sideEffects: "none",
      liveSettlementAllowed: false,
      notes: ["NASA FIRMS MAP_KEY required.", "No drone operation.", "Use as detection evidence, not evacuation authority."],
    },
    {
      adapterId: "opportunity_public_programs",
      productId: "opportunity_intel_pack",
      x402Stream: true,
      sourceIds: ["sam_gov_opportunities", "grants_gov", "regulations_gov", "data_gov_catalog"],
      status: "key_required",
      endpoint: null,
      inputMode: "Future buyer profile, geography, eligibility, and keywords",
      sideEffects: "none",
      liveSettlementAllowed: false,
      notes: ["SAM.gov and some grants/regulatory workflows can require API keys.", "Do not scrape authenticated portals.", "Use official APIs and exports."],
    },
  ];

  const missingProductSchemaIds = products.filter((product) => !product.schemaId).map((product) => product.productId);
  const missingProductQuality = products
    .filter(
      (product) =>
        product.quality.buyerValueMetrics.length === 0 ||
        product.quality.sourceFreshnessSla.caveats.length === 0 ||
        product.quality.auditSignals.length === 0,
    )
    .map((product) => product.productId);
  const missingRouteSchemaIds = productRoutes.filter((route) => !route.schemaId).map((route) => route.routeId);
  const paidContentRoutes = productRoutes.filter((route) => route.access === "simulated_x402_payment");
  const publicDiscoveryRoutes = productRoutes.filter((route) => route.access === "public");

  return {
    schemaId: "aoe.readiness.v1",
    generatedAt: new Date().toISOString(),
    liveSettlementAllowed: false,
    externalSideEffectsAllowed: false,
    adapters,
    contracts: {
      schemaId: "aoe.readiness.contracts.v1",
      buyerDiscoveryReady: missingProductSchemaIds.length === 0 && missingProductQuality.length === 0 && missingRouteSchemaIds.length === 0,
      products: {
        count: products.length,
        schemaIds: products.map((product) => product.schemaId),
        missingSchemaIds: missingProductSchemaIds,
        missingQualityMetadata: missingProductQuality,
      },
      routes: {
        discoveryEndpoint: "/v1/routes",
        count: productRoutes.length,
        publicCount: publicDiscoveryRoutes.length,
        simulatedPaymentRequiredCount: paidContentRoutes.length,
        missingSchemaIds: missingRouteSchemaIds,
        paidContentRouteIds: paidContentRoutes.map((route) => route.routeId),
      },
    },
    counts: adapters.reduce(
      (acc, adapter) => {
        acc[adapter.status] += 1;
        return acc;
      },
      { live_read_only: 0, configured_stub: 0, key_required: 0, blocked: 0 } satisfies Record<AdapterReadiness["status"], number>,
    ),
  };
}
