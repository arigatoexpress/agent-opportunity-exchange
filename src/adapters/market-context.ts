import { fetchFredSeriesReport, type FredSeriesReport } from "./fred.js";
import { fetchSecRecentFilings, type SecFilingsReport } from "./sec.js";

export interface MarketContextRequest {
  ticker: string;
  seriesIds: string[];
  filingForms?: string[];
  filingLimit?: number;
  seriesLimit?: number;
  timeoutMs?: number;
}

export interface MarketContextReport {
  schemaVersion: "sapphirealpha.market_context.v1";
  generatedAt: string;
  x402Stream: true;
  streamId: "sec_macro_context";
  query: Required<Pick<MarketContextRequest, "ticker" | "seriesIds" | "filingForms" | "filingLimit" | "seriesLimit">>;
  sources: Array<{
    sourceId: "sec_edgar" | "fred_alfred";
    retrievalMode: string;
  }>;
  company: SecFilingsReport["company"];
  filings: SecFilingsReport["filings"];
  macro: FredSeriesReport["series"];
  highlights: Array<{
    label: string;
    value: string;
    sourceId: "sec_edgar" | "fred_alfred";
  }>;
  caveats: string[];
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function fetchMarketContextReport(request: MarketContextRequest, fetcher: FetchLike = fetch): Promise<MarketContextReport> {
  const timeoutMs = normalizeTimeoutMs(request.timeoutMs ?? process.env.AOE_MARKET_FETCH_TIMEOUT_MS);
  const boundedFetcher = withSourceTimeout(fetcher, timeoutMs);
  const normalized = {
    ticker: request.ticker.toUpperCase(),
    seriesIds: [...new Set(request.seriesIds.map((seriesId) => seriesId.toUpperCase()))].slice(0, 12),
    filingForms: (request.filingForms ?? ["10-K", "10-Q", "8-K"]).map((form) => form.toUpperCase()).slice(0, 8),
    filingLimit: Math.max(1, Math.min(request.filingLimit ?? 5, 25)),
    seriesLimit: Math.max(1, Math.min(request.seriesLimit ?? 3, 24)),
  };

  const [sec, fred] = await Promise.all([
    fetchSecRecentFilings(
      {
        ticker: normalized.ticker,
        forms: normalized.filingForms,
        limit: normalized.filingLimit,
      },
      boundedFetcher,
    ),
    fetchFredSeriesReport(
      {
        seriesIds: normalized.seriesIds,
        limit: normalized.seriesLimit,
      },
      boundedFetcher,
    ),
  ]);

  return {
    schemaVersion: "sapphirealpha.market_context.v1",
    generatedAt: new Date().toISOString(),
    x402Stream: true,
    streamId: "sec_macro_context",
    query: normalized,
    sources: [
      { sourceId: "sec_edgar", retrievalMode: sec.source.retrievalMode },
      { sourceId: "fred_alfred", retrievalMode: fred.source.retrievalMode },
    ],
    company: sec.company,
    filings: sec.filings,
    macro: fred.series,
    highlights: buildHighlights(sec, fred),
    caveats: [
      "This is source-cited market context for research workflows, not investment advice.",
      "No portfolio personalization, buy/sell/hold recommendation, price target, or trade execution is provided.",
      "FRED graph CSV is useful for quick previews; production research should use revision-aware ALFRED vintages where needed.",
      "SEC filing metadata should be verified at the SEC source before business decisions.",
    ],
  };
}

export function withSourceTimeout(fetcher: FetchLike, timeoutMs: number): FetchLike {
  return async (url, init = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetcher(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`${sourceLabel(url)} request timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}

function normalizeTimeoutMs(value: number | string | undefined): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return 5_000;
  return Math.max(250, Math.min(parsed, 20_000));
}

function sourceLabel(url: string): "SEC" | "FRED" | "Upstream" {
  if (url.includes("sec.gov")) return "SEC";
  if (url.includes("fred.stlouisfed.org")) return "FRED";
  return "Upstream";
}

function buildHighlights(sec: SecFilingsReport, fred: FredSeriesReport): MarketContextReport["highlights"] {
  const latestFiling = sec.filings[0];
  const highlights: MarketContextReport["highlights"] = [];
  if (latestFiling) {
    highlights.push({
      label: "latest_filing",
      value: `${latestFiling.form} filed ${latestFiling.filingDate}`,
      sourceId: "sec_edgar",
    });
  }

  for (const series of fred.series) {
    if (!series.latest) continue;
    highlights.push({
      label: `${series.seriesId.toLowerCase()}_latest`,
      value: `${series.latest.value ?? "missing"} on ${series.latest.date}`,
      sourceId: "fred_alfred",
    });
  }

  return highlights;
}
