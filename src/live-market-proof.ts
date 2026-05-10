import { fetchMarketContextReport, type MarketContextReport, type MarketContextRequest } from "./adapters/market-context.js";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface LiveMarketProofRequest extends MarketContextRequest {
  mockDataUsed?: boolean;
}

export interface LiveMarketUpstreamProof {
  schemaId: "aoe.market_live_upstream_proof.v1";
  generatedAt: string;
  mode: "read_only_live_source_probe";
  x402Stream: true;
  productId: "market_regime_evidence_pack";
  streamId: "sec_macro_context";
  mockDataUsed: boolean;
  durationMs: number;
  overall: "pass" | "warn" | "fail";
  query: MarketContextReport["query"];
  upstream: {
    sec_edgar: UpstreamSourceProof;
    fred_alfred: UpstreamSourceProof;
  };
  reportSummary: {
    company: MarketContextReport["company"];
    filingCount: number;
    macroSeriesCount: number;
    latestFiling: MarketContextReport["filings"][number] | null;
    latestMacroObservations: Array<{
      seriesId: string;
      latest: MarketContextReport["macro"][number]["latest"];
      sourceUrl: string;
    }>;
    highlights: MarketContextReport["highlights"];
    evidenceProof: MarketContextReport["evidenceProof"];
  };
  sourceEvidence: Array<{
    sourceId: "sec_edgar" | "fred_alfred";
    retrievalMode: string;
    sourceUrls: string[];
    recordHashes: string[];
  }>;
  boundaries: {
    researchOnly: true;
    investmentAdvice: false;
    tradeExecution: false;
    personalizedPortfolioAdvice: false;
    liveSettlementAllowed: false;
    externalSideEffectsAllowed: false;
  };
  caveats: string[];
}

export interface UpstreamSourceProof {
  sourceId: "sec_edgar" | "fred_alfred";
  status: "ok" | "empty" | "degraded";
  retrievalMode: string;
  sourceUrls: string[];
  observedRecords: number;
  latestRecordDate: string | null;
  evidenceHashCount: number;
}

export async function buildLiveMarketUpstreamProof(
  request: LiveMarketProofRequest,
  fetcher: FetchLike = fetch,
): Promise<LiveMarketUpstreamProof> {
  const started = Date.now();
  const report = await fetchMarketContextReport(request, fetcher);
  const durationMs = Date.now() - started;
  const secProof = buildSecProof(report);
  const fredProof = buildFredProof(report);
  const overall = summarizeOverall(secProof, fredProof);

  return {
    schemaId: "aoe.market_live_upstream_proof.v1",
    generatedAt: new Date().toISOString(),
    mode: "read_only_live_source_probe",
    x402Stream: true,
    productId: "market_regime_evidence_pack",
    streamId: "sec_macro_context",
    mockDataUsed: request.mockDataUsed ?? false,
    durationMs,
    overall,
    query: report.query,
    upstream: {
      sec_edgar: secProof,
      fred_alfred: fredProof,
    },
    reportSummary: {
      company: report.company,
      filingCount: report.filings.length,
      macroSeriesCount: report.macro.length,
      latestFiling: report.filings[0] ?? null,
      latestMacroObservations: report.macro.map((series) => ({
        seriesId: series.seriesId,
        latest: series.latest,
        sourceUrl: series.sourceUrl,
      })),
      highlights: report.highlights,
      evidenceProof: report.evidenceProof,
    },
    sourceEvidence: [
      {
        sourceId: "sec_edgar",
        retrievalMode: secProof.retrievalMode,
        sourceUrls: secProof.sourceUrls,
        recordHashes: report.evidenceProof.filingRecordHashes,
      },
      {
        sourceId: "fred_alfred",
        retrievalMode: fredProof.retrievalMode,
        sourceUrls: fredProof.sourceUrls,
        recordHashes: report.evidenceProof.macroObservationRecordHashes,
      },
    ],
    boundaries: {
      researchOnly: true,
      investmentAdvice: false,
      tradeExecution: false,
      personalizedPortfolioAdvice: false,
      liveSettlementAllowed: false,
      externalSideEffectsAllowed: false,
    },
    caveats: [
      "This proves live read-only upstream access and provenance shape; it is not investment advice.",
      "No buy/sell/hold recommendation, portfolio personalization, price target, order signing, or trade execution is provided.",
      "SEC EDGAR access can be rate-limited; keep a descriptive User-Agent and retry with backoff.",
      "FRED graph CSV is not revision-aware; production historical claims should use explicit FRED/ALFRED vintages where required.",
      "Payment rails remain simulated or testnet-only; this route does not make paid calls or move funds.",
    ],
  };
}

export function summarizeLiveMarketProof(proof: LiveMarketUpstreamProof): string {
  return [
    `market_live_upstream_proof ${proof.overall}`,
    `ticker=${proof.query.ticker}`,
    `mockDataUsed=${proof.mockDataUsed}`,
    `durationMs=${proof.durationMs}`,
    `sec_edgar=${proof.upstream.sec_edgar.status} filings=${proof.upstream.sec_edgar.observedRecords} latest=${proof.upstream.sec_edgar.latestRecordDate ?? "none"}`,
    `fred_alfred=${proof.upstream.fred_alfred.status} observations=${proof.upstream.fred_alfred.observedRecords} latest=${proof.upstream.fred_alfred.latestRecordDate ?? "none"}`,
    `reportHash=${proof.reportSummary.evidenceProof.reportHash}`,
  ].join("\n");
}

function buildSecProof(report: MarketContextReport): UpstreamSourceProof {
  const source = report.sources.find((row) => row.sourceId === "sec_edgar");
  const sourceUrls = [
    report.company ? `https://data.sec.gov/submissions/CIK${report.company.cik}.json` : null,
    report.company?.ticker ? "https://www.sec.gov/files/company_tickers.json" : null,
  ].filter((url): url is string => Boolean(url));

  return {
    sourceId: "sec_edgar",
    status: report.filings.length > 0 ? "ok" : "empty",
    retrievalMode: source?.retrievalMode ?? "read_only_public_api",
    sourceUrls,
    observedRecords: report.filings.length,
    latestRecordDate: report.filings[0]?.filingDate ?? null,
    evidenceHashCount: report.evidenceProof.filingRecordHashes.length,
  };
}

function buildFredProof(report: MarketContextReport): UpstreamSourceProof {
  const source = report.sources.find((row) => row.sourceId === "fred_alfred");
  const observations = report.macro.flatMap((series) => series.observations.map((observation) => ({ seriesId: series.seriesId, ...observation })));
  const latest = observations
    .filter((observation) => observation.date)
    .sort((left, right) => right.date.localeCompare(left.date))[0];

  return {
    sourceId: "fred_alfred",
    status: observations.length > 0 ? "ok" : "empty",
    retrievalMode: source?.retrievalMode ?? "read_only_public_csv",
    sourceUrls: report.macro.map((series) => series.sourceUrl),
    observedRecords: observations.length,
    latestRecordDate: latest?.date ?? null,
    evidenceHashCount: report.evidenceProof.macroObservationRecordHashes.length,
  };
}

function summarizeOverall(secProof: UpstreamSourceProof, fredProof: UpstreamSourceProof): LiveMarketUpstreamProof["overall"] {
  if (secProof.status === "ok" && fredProof.status === "ok") return "pass";
  if (secProof.status === "degraded" || fredProof.status === "degraded") return "fail";
  return "warn";
}
