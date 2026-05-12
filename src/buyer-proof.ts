import { productRoutes, products, sources } from "./catalog.js";
import { buildReadiness } from "./readiness.js";
import { buildSellabilityReport } from "./sellability.js";
import type { SourceRecord } from "./types.js";

export const BUYER_PROOF_SCHEMA_ID = "aoe.buyer_proof.v1";

export function buildBuyerProof(now = new Date()) {
  const readiness = buildReadiness();
  const sellability = buildSellabilityReport(now);
  const sourceRiskCounts = countSourceRisks();
  const liveReadOnlyRoutes = productRoutes.filter((route) => route.readiness === "live_read_only");
  const publicRoutes = productRoutes.filter((route) => route.access === "public");
  const previewRoutes = productRoutes.filter((route) => /preview|report|proof/.test(route.routeId));

  return {
    schemaId: BUYER_PROOF_SCHEMA_ID,
    generatedAt: now.toISOString(),
    headline: "Rights-cleared evidence packets with public proof before simulated or testnet paid access.",
    counts: {
      products: products.length,
      eligibleProducts: sellability.eligibleProducts,
      sources: sources.length,
      greenSources: sourceRiskCounts.green,
      yellowSources: sourceRiskCounts.yellow,
      redSources: sourceRiskCounts.red,
      publicRoutes: publicRoutes.length,
      liveReadOnlyRoutes: liveReadOnlyRoutes.length,
      previewOrProofRoutes: previewRoutes.length,
    },
    sellability: {
      overallScore: sellability.overallScore,
      grade: sellability.overallGrade,
      criticalIssueCount: sellability.criticalIssues.length,
      warningCount: sellability.products.reduce((total, product) => total + product.issues.filter((issue) => issue.severity === "warning").length, 0),
      eligibleProductIds: sellability.products.filter((product) => product.eligibleForPaidPreview).map((product) => product.productId),
      products: sellability.products.map((product) => ({
        productId: product.productId,
        title: product.title,
        category: product.category,
        score: product.score,
        grade: product.grade,
        eligibleForPaidPreview: product.eligibleForPaidPreview,
        licenseReviewNeeded: product.licenseReviewNeeded,
        warnings: product.issues.filter((issue) => issue.severity === "warning").map((issue) => issue.code),
        livePreviewRoutes: productRoutes
          .filter((route) => route.productIds.includes(product.productId) && route.readiness === "live_read_only")
          .map((route) => route.route),
      })),
    },
    featuredProof: [
      {
        productId: "cyber_exploited_vuln_priority",
        label: "Authorized cyber inventory proof packet",
        route: "/v1/adapters/cyber/inventory-priority/report",
        proofValue: "Maps buyer-supplied assets to live KEV, EPSS, and NVD evidence with an HTML report packet.",
      },
      {
        productId: "opportunity_intel_pack",
        label: "Public-program opportunity preview",
        route: "/v1/adapters/opportunities/public-programs/preview",
        proofValue: "Searches official public opportunity and dataset sources while marking SAM.gov as key-required.",
      },
      {
        productId: "market_regime_evidence_pack",
        label: "SEC/FRED live upstream proof",
        route: "/v1/streams/market-context/live-proof",
        proofValue: "Shows public-source market evidence, hashes, mock-data posture, and research-only caveats before paid access.",
      },
    ],
    buyerValue: [
      "The product sells normalization, prioritization, provenance, freshness, and checklists rather than raw source resale.",
      "Public routes prove schema, source ids, caveats, and safety posture before a buyer presents a simulated or testnet payment.",
      "Each paid product remains side-effect free: no scans, sends, trades, filings, dispatch, wallet signing, or production settlement.",
    ],
    readiness: {
      schemaId: readiness.schemaId,
      buyerDiscoveryReady: readiness.contracts.buyerDiscoveryReady,
      liveReadOnlyAdapters: readiness.counts.live_read_only,
      simulatedPaymentRequired: readiness.contracts.routes.simulatedPaymentRequiredCount,
      contractCoverage: readiness.contracts,
    },
    safety: {
      liveSettlementAllowed: false,
      externalSideEffectsAllowed: false,
      rawSourceResaleAllowed: false,
      outboundTelegramSendsAllowed: false,
      activeScanningAllowed: false,
      tradingOrMoneyMovementAllowed: false,
    },
  };
}

function countSourceRisks(): Record<SourceRecord["risk"], number> {
  return sources.reduce(
    (acc, source) => {
      acc[source.risk] += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 } satisfies Record<SourceRecord["risk"], number>,
  );
}
