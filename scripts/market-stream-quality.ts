import { fileURLToPath } from "node:url";
import { fetchMarketContextReport, type MarketContextReport } from "../src/adapters/market-context.js";
import { createApp } from "../src/app.js";
import { getProduct, getSource, streams } from "../src/catalog.js";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type QualityStatus = "pass" | "fail" | "warn";

export interface QualityCheck {
  id: string;
  label: string;
  status: QualityStatus;
  detail: string;
  evidence?: unknown;
}

export interface MarketStreamQualityOptions {
  fetcher?: FetchLike;
  degradedFetcher?: FetchLike;
  maxGeneratedAgeMinutes?: number;
}

export interface MarketStreamQualityResult {
  generatedAt: string;
  harnessId: "market_stream_quality_v1";
  streamId: "sec_macro_context";
  productId: "market_regime_evidence_pack";
  overall: "pass" | "fail";
  checks: QualityCheck[];
  gaps: string[];
  primaryReport: MarketContextReport;
  degradedPreview: Record<string, unknown>;
}

const MARKET_STREAM_ID = "sec_macro_context";
const MARKET_PRODUCT_ID = "market_regime_evidence_pack";
const DEFAULT_SERIES_IDS = ["FEDFUNDS", "UNRATE"];
const FORBIDDEN_BOUNDARY_KEY_PATTERNS = [
  /(^|_)price_?target$/i,
  /^targetPrice$/i,
  /^recommendation$/i,
  /^signal$/i,
  /^order$/i,
  /^trade$/i,
  /^tradeExecution$/i,
  /^positionSize$/i,
  /^portfolioAction$/i,
];

export async function runMarketStreamQualityHarness(options: MarketStreamQualityOptions = {}): Promise<MarketStreamQualityResult> {
  const fetcher = options.fetcher ?? buildSyntheticMarketFetch();
  const degradedFetcher = options.degradedFetcher ?? buildSyntheticMarketFetch({ secSubmissionsStatus: 429 });
  const maxGeneratedAgeMinutes = options.maxGeneratedAgeMinutes ?? 5;
  const stream = streams.find((candidate) => candidate.streamId === MARKET_STREAM_ID);
  const product = getProduct(MARKET_PRODUCT_ID);
  const checks: QualityCheck[] = [];

  const primaryReport = await fetchMarketContextReport(
    {
      ticker: "TEST",
      seriesIds: DEFAULT_SERIES_IDS,
      filingLimit: 2,
      seriesLimit: 2,
    },
    fetcher,
  );

  const degradedPreview = await runDegradedMarketPreview(degradedFetcher);
  const sourceRecords = stream?.sourceIds.map((sourceId) => getSource(sourceId)) ?? [];
  const sourceIds = new Set(primaryReport.sources.map((source) => source.sourceId));
  const registrySourceIds = new Set(stream?.sourceIds ?? []);

  checks.push({
    id: "stream-registry-linkage",
    label: "Stream is linked to the paid market product",
    status: stream && product && stream.productId === product.productId && stream.x402Stream && product.x402Stream ? "pass" : "fail",
    detail: "The sellable stream must resolve to one paid product and keep x402/testnet posture explicit.",
    evidence: {
      streamId: stream?.streamId,
      productId: product?.productId,
      streamProductId: stream?.productId,
      settlementMode: product?.settlementMode,
      liveSettlementAllowed: product?.liveSettlementAllowed,
      externalSideEffectsAllowed: product?.externalSideEffectsAllowed,
    },
  });

  checks.push({
    id: "freshness",
    label: "Freshness metadata is present and bounded",
    status:
      isRecentIso(primaryReport.generatedAt, maxGeneratedAgeMinutes) &&
      sourceRecords.every((source) => source && source.cadence && source.rights.cacheTtlSeconds > 0) &&
      primaryReport.filings.every((filing) => filing.filingDate.length > 0) &&
      primaryReport.macro.every((series) => series.latest?.date)
        ? "pass"
        : "fail",
    detail: "The harness expects a fresh generation timestamp, source cadences, source TTLs, filing dates, and latest macro dates.",
    evidence: {
      generatedAt: primaryReport.generatedAt,
      maxGeneratedAgeMinutes,
      sourceCadences: sourceRecords.map((source) => ({ sourceId: source?.sourceId, cadence: source?.cadence, ttl: source?.rights.cacheTtlSeconds })),
      latestMacroDates: primaryReport.macro.map((series) => ({ seriesId: series.seriesId, latestDate: series.latest?.date ?? null })),
    },
  });

  checks.push({
    id: "provenance-source-ids",
    label: "Source IDs and source links are complete",
    status:
      Boolean(stream) &&
      sameSet(sourceIds, registrySourceIds) &&
      sourceRecords.every((source) => source && source.owner && source.url && source.rights.licenseId) &&
      primaryReport.sources.every((source) => source.retrievalMode.length > 0) &&
      primaryReport.filings.every((filing) => filing.archiveUrl?.startsWith("https://www.sec.gov/Archives/")) &&
      primaryReport.macro.every((series) => series.sourceUrl.startsWith("https://fred.stlouisfed.org/graph/fredgraph.csv"))
        ? "pass"
        : "fail",
    detail: "Every stream source must resolve through the registry and every normalized record needs a source path back to SEC or FRED.",
    evidence: {
      reportSourceIds: [...sourceIds].sort(),
      registrySourceIds: [...registrySourceIds].sort(),
      filingArchiveUrls: primaryReport.filings.map((filing) => filing.archiveUrl),
      macroSourceUrls: primaryReport.macro.map((series) => series.sourceUrl),
    },
  });

  checks.push({
    id: "rights-envelope",
    label: "Rights envelope supports derived resale only",
    status:
      sourceRecords.every(
        (source) =>
          source &&
          source.risk === "green" &&
          source.rights.allowedUses.some((use) => ["cite", "fact_extract", "derived_analysis"].includes(use)) &&
          source.rights.prohibitedUses.some((use) => /raw|resell|redistribute/i.test(use)) &&
          source.rights.attribution.length > 0 &&
          source.rights.redistribution === "derived_facts_with_citation",
      )
        ? "pass"
        : "fail",
    detail: "The active stream sells normalized facts, links, metadata, and analysis; raw source resale must stay prohibited.",
    evidence: sourceRecords.map((source) => ({
      sourceId: source?.sourceId,
      risk: source?.risk,
      licenseId: source?.rights.licenseId,
      allowedUses: source?.rights.allowedUses,
      prohibitedUses: source?.rights.prohibitedUses,
      redistribution: source?.rights.redistribution,
    })),
  });

  checks.push({
    id: "value-added-fields",
    label: "Payload contains value-added analysis fields",
    status:
      primaryReport.query.ticker === "TEST" &&
      primaryReport.highlights.length >= 3 &&
      primaryReport.highlights.every((highlight) => registrySourceIds.has(highlight.sourceId)) &&
      primaryReport.company.name.length > 0 &&
      primaryReport.filings.some((filing) => filing.archiveUrl) &&
      primaryReport.macro.every((series) => series.observations.length > 0 && series.latest)
        ? "pass"
        : "fail",
    detail: "Buyer value should come from normalization, highlights, filing links, parsed observations, and source-cited context.",
    evidence: {
      normalizedQuery: primaryReport.query,
      highlights: primaryReport.highlights,
      filingCount: primaryReport.filings.length,
      macroSeries: primaryReport.macro.map((series) => ({ seriesId: series.seriesId, observationCount: series.observations.length })),
    },
  });

  const boundaryText = [product?.disclaimers.join(" "), stream?.caveats.join(" "), primaryReport.caveats.join(" ")].join(" ");
  const forbiddenKeys = findForbiddenBoundaryKeys(primaryReport);
  checks.push({
    id: "non-advice-non-execution-boundary",
    label: "Market output stays non-advisory and non-executable",
    status:
      Boolean(product) &&
      product?.liveSettlementAllowed === false &&
      product?.externalSideEffectsAllowed === false &&
      /not investment advice/i.test(boundaryText) &&
      /no buy\/sell\/hold/i.test(boundaryText) &&
      /no trade execution/i.test(boundaryText) &&
      forbiddenKeys.length === 0
        ? "pass"
        : "fail",
    detail: "The market stream must be research context only and must not expose advice-shaped or execution-shaped fields.",
    evidence: {
      liveSettlementAllowed: product?.liveSettlementAllowed,
      externalSideEffectsAllowed: product?.externalSideEffectsAllowed,
      forbiddenKeys,
      caveats: primaryReport.caveats,
    },
  });

  checks.push({
    id: "degraded-source-behavior",
    label: "SEC degraded mode preserves usable macro context",
    status: isPassingDegradedPreview(degradedPreview) ? "pass" : "fail",
    detail: "A temporary SEC failure should return an honest partial preview with FRED context, degraded status, and no advice or execution claims.",
    evidence: {
      partial: degradedPreview.partial,
      sourceStatus: degradedPreview.sourceStatus,
      reportShape: summarizeDegradedPreview(degradedPreview),
    },
  });

  const gaps = [
    "Harness uses deterministic synthetic SEC/FRED responses; it does not prove live upstream availability or latency.",
    "FRED graph CSV checks are not revision-aware ALFRED vintage checks yet.",
    "Product-level market catalog still names yellow/licensed sources for future packs; this harness only certifies the active SEC/FRED stream.",
    "No normalized record hash is persisted for market stream rows yet.",
  ];

  return {
    generatedAt: new Date().toISOString(),
    harnessId: "market_stream_quality_v1",
    streamId: MARKET_STREAM_ID,
    productId: MARKET_PRODUCT_ID,
    overall: checks.some((check) => check.status === "fail") ? "fail" : "pass",
    checks,
    gaps,
    primaryReport,
    degradedPreview,
  };
}

export function buildSyntheticMarketFetch(options: { secSubmissionsStatus?: number; fredStatus?: number } = {}): FetchLike {
  return async (url) => {
    if (url.endsWith("/company_tickers.json")) {
      return jsonResponse({
        "0": { cik_str: 12345, ticker: "TEST", title: "Test Company Inc." },
      });
    }

    if (url === "https://data.sec.gov/submissions/CIK0000012345.json") {
      if (options.secSubmissionsStatus && options.secSubmissionsStatus !== 200) {
        return new Response("synthetic upstream degradation", { status: options.secSubmissionsStatus });
      }
      return jsonResponse({
        name: "Test Company Inc.",
        filings: {
          recent: {
            accessionNumber: ["0000012345-26-000010", "0000012345-26-000009"],
            filingDate: ["2026-05-01", "2026-04-15"],
            reportDate: ["2026-03-31", "2026-03-01"],
            form: ["10-Q", "8-K"],
            primaryDocument: ["test-10q.htm", "test-8k.htm"],
          },
        },
      });
    }

    const parsedUrl = new URL(url);
    if (parsedUrl.origin === "https://fred.stlouisfed.org") {
      if (options.fredStatus && options.fredStatus !== 200) {
        return new Response("synthetic upstream degradation", { status: options.fredStatus });
      }
      const seriesId = parsedUrl.searchParams.get("id") ?? "UNKNOWN";
      return new Response(`observation_date,${seriesId}
2026-04-01,4.25
2026-05-01,4.10
`, { status: 200, headers: { "Content-Type": "text/csv" } });
    }

    return new Response(`Unhandled synthetic URL: ${url}`, { status: 500 });
  };
}

export function findForbiddenBoundaryKeys(value: unknown, path = "$"): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => findForbiddenBoundaryKeys(entry, `${path}[${index}]`));
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const nextPath = `${path}.${key}`;
    const keyViolations = FORBIDDEN_BOUNDARY_KEY_PATTERNS.some((pattern) => pattern.test(key)) ? [nextPath] : [];
    return [...keyViolations, ...findForbiddenBoundaryKeys(child, nextPath)];
  });
}

function isRecentIso(value: string, maxAgeMinutes: number): boolean {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return false;
  const ageMs = Math.abs(Date.now() - timestamp);
  return ageMs <= maxAgeMinutes * 60_000;
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) return false;
  return [...left].every((entry) => right.has(entry));
}

async function runDegradedMarketPreview(fetcher: FetchLike): Promise<Record<string, unknown>> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetcher as typeof fetch;
  try {
    const response = await createApp().request("/v1/streams/market-context/preview", {
      method: "POST",
      body: JSON.stringify({
        ticker: "TEST",
        seriesIds: DEFAULT_SERIES_IDS,
        filingLimit: 2,
        seriesLimit: 2,
      }),
      headers: { "Content-Type": "application/json" },
    });
    return (await response.json()) as Record<string, unknown>;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function isPassingDegradedPreview(body: Record<string, unknown>): boolean {
  const report = body.report as Record<string, unknown> | undefined;
  const sourceStatus = body.sourceStatus as Record<string, { status?: string }> | undefined;
  const caveats = Array.isArray(report?.caveats) ? report.caveats.join(" ") : "";
  return (
    body.partial === true &&
    body.x402Stream === true &&
    sourceStatus?.sec_edgar?.status === "degraded" &&
    sourceStatus?.fred_alfred?.status === "ok" &&
    report?.company === null &&
    Array.isArray(report?.filings) &&
    report.filings.length === 0 &&
    Array.isArray(report?.macro) &&
    report.macro.length >= 1 &&
    /not investment advice/i.test(caveats) &&
    /trade execution/i.test(caveats) &&
    findForbiddenBoundaryKeys(body).length === 0
  );
}

function summarizeDegradedPreview(body: Record<string, unknown>) {
  const report = body.report as Record<string, unknown> | undefined;
  return {
    hasReport: Boolean(report),
    company: report?.company ?? undefined,
    filingCount: Array.isArray(report?.filings) ? report.filings.length : null,
    macroCount: Array.isArray(report?.macro) ? report.macro.length : null,
    caveats: report?.caveats,
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function renderCliSummary(result: MarketStreamQualityResult): string {
  const lines = [
    `market_stream_quality ${result.overall}`,
    `stream=${result.streamId}`,
    `product=${result.productId}`,
    "",
    "checks:",
    ...result.checks.map((check) => `- ${check.status.toUpperCase()} ${check.id}: ${check.label}`),
    "",
    "residual_gaps:",
    ...result.gaps.map((gap) => `- ${gap}`),
  ];
  return lines.join("\n");
}

async function main() {
  const result = await runMarketStreamQualityHarness();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderCliSummary(result));
  }
  if (result.overall !== "pass") {
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main();
}
