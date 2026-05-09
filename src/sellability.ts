import { artifacts, products, sources, streams } from "./catalog.js";
import type { Artifact, Product, SourceRecord, StreamDefinition } from "./types.js";

export interface SellabilityIssue {
  severity: "critical" | "warning" | "info";
  code: string;
  message: string;
}

export interface ProductSellabilityScore {
  productId: string;
  title: string;
  category: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  eligibleForPaidPreview: boolean;
  licenseReviewNeeded: boolean;
  livePreviewRoutes: string[];
  sourceRiskCounts: Record<SourceRecord["risk"], number>;
  issues: SellabilityIssue[];
}

export interface SellabilityReport {
  generatedAt: string;
  schemaVersion: "sapphirealpha.sellability.v1";
  overallScore: number;
  overallGrade: ProductSellabilityScore["grade"];
  eligibleProducts: number;
  products: ProductSellabilityScore[];
  criticalIssues: SellabilityIssue[];
  recommendations: string[];
}

const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
const artifactsByProduct = artifacts.reduce<Map<string, Artifact[]>>((acc, artifact) => {
  const rows = acc.get(artifact.productId) ?? [];
  rows.push(artifact);
  acc.set(artifact.productId, rows);
  return acc;
}, new Map());
const streamsByProduct = streams.reduce<Map<string, StreamDefinition[]>>((acc, stream) => {
  const rows = acc.get(stream.productId) ?? [];
  rows.push(stream);
  acc.set(stream.productId, rows);
  return acc;
}, new Map());

export function buildSellabilityReport(now = new Date()): SellabilityReport {
  const productScores = products.map(scoreProductSellability);
  const overallScore = Math.round(productScores.reduce((total, product) => total + product.score, 0) / Math.max(productScores.length, 1));
  const criticalIssues = productScores.flatMap((product) => product.issues.filter((issue) => issue.severity === "critical"));
  return {
    generatedAt: now.toISOString(),
    schemaVersion: "sapphirealpha.sellability.v1",
    overallScore,
    overallGrade: grade(overallScore),
    eligibleProducts: productScores.filter((product) => product.eligibleForPaidPreview).length,
    products: productScores,
    criticalIssues,
    recommendations: buildRecommendations(productScores),
  };
}

export function scoreProductSellability(product: Product): ProductSellabilityScore {
  const issues: SellabilityIssue[] = [];
  const productArtifacts = artifactsByProduct.get(product.productId) ?? [];
  const productStreams = streamsByProduct.get(product.productId) ?? [];
  const productSources = resolveSources(product.sourceIds, issues);
  const sourceRiskCounts = countSourceRisks(productSources);

  requireCondition(issues, product.x402Stream, "critical", "product_not_x402_stream", "Sellable products must be explicit x402 streams.");
  requireCondition(
    issues,
    product.settlementMode === "simulated_or_testnet" && !product.liveSettlementAllowed,
    "critical",
    "live_settlement_enabled",
    "Live settlement must stay disabled until compliance, refunds, accounting, and source terms are ready.",
  );
  requireCondition(
    issues,
    !product.externalSideEffectsAllowed,
    "critical",
    "external_side_effects_allowed",
    "Paid data access must not trigger scans, sends, trades, filings, drone operations, or other external side effects.",
  );
  requireCondition(issues, product.sourceIds.length > 0, "critical", "missing_sources", "Product needs at least one registered source id.");
  requireCondition(issues, productArtifacts.length > 0 || productStreams.length > 0, "critical", "missing_artifact_or_stream", "Product needs a previewable artifact or stream.");
  requireCondition(issues, parsePrice(product.priceUsd) > 0, "warning", "invalid_price", "Product should expose a positive machine-readable price.");
  requireCondition(issues, product.buyerValue.trim().length >= 48, "warning", "thin_buyer_value", "Buyer value should explain what pain the product removes.");
  requireCondition(issues, product.disclaimers.length > 0, "critical", "missing_disclaimers", "Product needs domain disclaimers before paid use.");

  for (const artifact of productArtifacts) {
    scoreArtifact(artifact, productSources, issues);
  }
  for (const stream of productStreams) {
    scoreStream(stream, issues);
  }

  if (sourceRiskCounts.yellow > 0) {
    issues.push({
      severity: "warning",
      code: "license_review_needed",
      message: "One or more sources require terms review before raw or near-raw redistribution.",
    });
  }
  if (sourceRiskCounts.red > 0) {
    issues.push({
      severity: "critical",
      code: "red_source_present",
      message: "A red-risk source blocks paid product eligibility.",
    });
  }
  if (mentionsSeparateWildfireLane(product)) {
    issues.push({
      severity: "critical",
      code: "wildfire_in_x402_product",
      message: "Wildfire and drone-readiness must remain outside the x402 stream catalog.",
    });
  }
  if (product.category === "market_intelligence") {
    requireIncludes(issues, product.disclaimers, "Not investment advice.", "critical", "market_advice_boundary_missing");
    requireIncludes(issues, product.disclaimers, "No trade execution.", "critical", "market_execution_boundary_missing");
  }
  if (product.category === "defensive_cyber") {
    requireIncludes(issues, product.disclaimers, "Defensive prioritization only.", "critical", "cyber_defensive_boundary_missing");
    requireIncludes(issues, product.disclaimers, "No exploit payloads or credential material.", "critical", "cyber_offensive_boundary_missing");
  }

  const score = Math.max(0, 100 - issues.reduce((total, issue) => total + (issue.severity === "critical" ? 28 : issue.severity === "warning" ? 9 : 2), 0));
  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  return {
    productId: product.productId,
    title: product.title,
    category: product.category,
    score,
    grade: grade(score),
    eligibleForPaidPreview: criticalCount === 0 && score >= 80,
    licenseReviewNeeded: sourceRiskCounts.yellow > 0 || sourceRiskCounts.red > 0,
    livePreviewRoutes: productStreams.map((stream) => stream.route),
    sourceRiskCounts,
    issues,
  };
}

function scoreArtifact(artifact: Artifact, productSources: SourceRecord[], issues: SellabilityIssue[]) {
  requireCondition(issues, artifact.preview.headline.trim().length >= 24, "warning", "thin_preview_headline", `${artifact.artifactId} preview headline is thin.`);
  requireCondition(issues, artifact.preview.dataPoints.length >= 3, "warning", "thin_preview_data_points", `${artifact.artifactId} needs at least three data points.`);
  requireCondition(issues, artifact.content.evidenceCards.length >= 2, "warning", "thin_evidence_cards", `${artifact.artifactId} needs at least two evidence cards.`);
  requireCondition(issues, artifact.content.outputPolicy.length > 0, "critical", "missing_output_policy", `${artifact.artifactId} needs an output policy.`);
  requireCondition(issues, artifact.preview.freshness.ttlSeconds > 0, "critical", "missing_freshness_ttl", `${artifact.artifactId} needs a freshness TTL.`);

  const missingSources = artifact.sourceIds.filter((sourceId) => !sourceById.has(sourceId));
  for (const sourceId of missingSources) {
    issues.push({ severity: "critical", code: "unknown_artifact_source", message: `${artifact.artifactId} references unknown source ${sourceId}.` });
  }

  const restrictiveSources = productSources.filter((source) => source.rights.redistribution === "blocked_until_license_review");
  if (restrictiveSources.length > 0 && artifact.rights.redistribution !== "blocked_until_license_review") {
    issues.push({
      severity: "warning",
      code: "artifact_rights_less_restrictive_than_source",
      message: `${artifact.artifactId} should inherit the most restrictive source-rights envelope before sale.`,
    });
  }
}

function scoreStream(stream: StreamDefinition, issues: SellabilityIssue[]) {
  requireCondition(issues, stream.schemaVersion.includes("."), "critical", "missing_stream_schema", `${stream.streamId} needs a versioned schema id.`);
  requireCondition(issues, stream.caveats.length > 0, "critical", "missing_stream_caveats", `${stream.streamId} needs caveats.`);
  requireCondition(issues, Object.keys(stream.inputSchema).length > 0, "critical", "missing_stream_input_schema", `${stream.streamId} needs an input schema summary.`);
  requireCondition(issues, stream.outputSummary.trim().length >= 40, "warning", "thin_stream_output_summary", `${stream.streamId} needs a clearer output summary.`);
}

function resolveSources(sourceIds: string[], issues: SellabilityIssue[]) {
  const rows: SourceRecord[] = [];
  for (const sourceId of sourceIds) {
    const source = sourceById.get(sourceId);
    if (!source) {
      issues.push({ severity: "critical", code: "unknown_product_source", message: `Product references unknown source ${sourceId}.` });
      continue;
    }
    rows.push(source);
    scoreSource(source, issues);
  }
  return rows;
}

function scoreSource(source: SourceRecord, issues: SellabilityIssue[]) {
  requireCondition(issues, source.url.startsWith("https://"), "warning", "source_url_not_https", `${source.sourceId} should use an HTTPS source URL.`);
  requireCondition(issues, source.rights.allowedUses.length > 0, "critical", "source_missing_allowed_uses", `${source.sourceId} rights need allowed uses.`);
  requireCondition(issues, source.rights.prohibitedUses.length > 0, "critical", "source_missing_prohibited_uses", `${source.sourceId} rights need prohibited uses.`);
  requireCondition(issues, source.rights.attribution.trim().length > 0, "critical", "source_missing_attribution", `${source.sourceId} rights need attribution.`);
  requireCondition(issues, source.rights.cacheTtlSeconds > 0, "critical", "source_missing_cache_ttl", `${source.sourceId} rights need cache TTL.`);
}

function countSourceRisks(productSources: SourceRecord[]) {
  return productSources.reduce(
    (acc, source) => {
      acc[source.risk] += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 } satisfies Record<SourceRecord["risk"], number>,
  );
}

function mentionsSeparateWildfireLane(product: Product) {
  const joined = [...product.tags, ...product.sourceIds, product.title, product.buyerValue].join(" ").toLowerCase();
  return joined.includes("wildfire") || joined.includes("drone") || joined.includes("nasa_firms") || joined.includes("nifc_wfigs");
}

function parsePrice(price: string) {
  const parsed = Number.parseFloat(price);
  return Number.isFinite(parsed) ? parsed : 0;
}

function requireCondition(
  issues: SellabilityIssue[],
  condition: boolean,
  severity: SellabilityIssue["severity"],
  code: string,
  message: string,
) {
  if (!condition) issues.push({ severity, code, message });
}

function requireIncludes(
  issues: SellabilityIssue[],
  values: string[],
  expected: string,
  severity: SellabilityIssue["severity"],
  code: string,
) {
  if (!values.includes(expected)) {
    issues.push({ severity, code, message: `Missing required disclaimer: ${expected}` });
  }
}

function grade(score: number): ProductSellabilityScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function buildRecommendations(scores: ProductSellabilityScore[]) {
  const recommendations: string[] = [];
  const market = scores.find((score) => score.productId === "market_regime_evidence_pack");
  if (market?.licenseReviewNeeded) {
    recommendations.push("Split the market product into a green-source SEC/FRED stream and a separate licensed onchain/vendor stream.");
  }
  if (scores.some((score) => score.livePreviewRoutes.length === 0)) {
    recommendations.push("Add at least one public preview route for every paid product before marketing it.");
  }
  if (scores.some((score) => score.issues.some((issue) => issue.code === "artifact_rights_less_restrictive_than_source"))) {
    recommendations.push("Make artifact rights inherit the most restrictive source rights before accepting paid access.");
  }
  recommendations.push("Market only products with zero critical issues, live preview evidence, and current source-readiness proof.");
  return [...new Set(recommendations)];
}
