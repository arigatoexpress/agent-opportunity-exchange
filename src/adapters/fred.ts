import { sha256 } from "../hash.js";

export interface FredSeriesRequest {
  seriesIds: string[];
  limit?: number;
}

export interface FredObservation {
  date: string;
  value: number | null;
  recordHash: string;
}

export interface FredSeries {
  seriesId: string;
  sourceUrl: string;
  observations: FredObservation[];
  latest: FredObservation | null;
  recordHash: string;
}

export interface FredSeriesReport {
  generatedAt: string;
  query: FredSeriesRequest;
  source: {
    sourceId: "fred_alfred";
    retrievalMode: "read_only_public_csv";
  };
  series: FredSeries[];
  caveats: string[];
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const FRED_GRAPH_CSV_BASE = "https://fred.stlouisfed.org/graph/fredgraph.csv";

export async function fetchFredSeriesReport(request: FredSeriesRequest, fetcher: FetchLike = fetch): Promise<FredSeriesReport> {
  const seriesIds = [...new Set(request.seriesIds.map((seriesId) => seriesId.toUpperCase()))].slice(0, 25);
  const limit = Math.max(1, Math.min(request.limit ?? 12, 500));

  const series = await Promise.all(
    seriesIds.map(async (seriesId) => {
      const url = new URL(FRED_GRAPH_CSV_BASE);
      url.searchParams.set("id", seriesId);
      const response = await fetcher(url.toString(), {
        headers: {
          Accept: "text/csv",
          "User-Agent": "agent-opportunity-exchange/0.1 read-only FRED adapter",
        },
      });
      if (!response.ok) {
        throw new Error(`FRED CSV request failed for ${seriesId}: ${response.status}`);
      }
      const text = await response.text();
      const observations = parseFredCsv(text, seriesId).slice(-limit);
      return {
        seriesId,
        sourceUrl: url.toString(),
        observations,
        latest: observations.at(-1) ?? null,
        recordHash: hashFredSeries(seriesId, url.toString(), observations),
      };
    }),
  );

  return {
    generatedAt: new Date().toISOString(),
    query: request,
    source: {
      sourceId: "fred_alfred",
      retrievalMode: "read_only_public_csv",
    },
    series,
    caveats: [
      "This adapter uses public FRED graph CSV exports for quick macro evidence packs.",
      "For revision-aware research, use the FRED/ALFRED API with explicit vintage dates and keys where required.",
      "This is macro research context only, not investment advice or a trading signal.",
    ],
  };
}

export function parseFredCsv(text: string, expectedSeriesId: string): FredObservation[] {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(",").map((entry) => entry.trim()));
  if (rows.length < 2) return [];

  const header = rows[0];
  const dateIndex = header.findIndex((entry) => entry.toLowerCase() === "observation_date" || entry.toLowerCase() === "date");
  const valueIndex = header.findIndex((entry, index) => index !== dateIndex && entry.toUpperCase() === expectedSeriesId.toUpperCase());
  const fallbackValueIndex = valueIndex === -1 ? header.findIndex((_, index) => index !== dateIndex) : valueIndex;
  if (dateIndex === -1 || fallbackValueIndex === -1) return [];

  return rows.slice(1).map((row) => hashFredObservation(expectedSeriesId, { date: row[dateIndex] ?? "", value: parseFredValue(row[fallbackValueIndex]) }));
}

function parseFredValue(raw: string | undefined): number | null {
  if (!raw || raw === ".") return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

function hashFredObservation(seriesId: string, observation: Omit<FredObservation, "recordHash">): FredObservation {
  return {
    ...observation,
    recordHash: sha256({
      sourceId: "fred_alfred",
      seriesId: seriesId.toUpperCase(),
      date: observation.date,
      value: observation.value,
    }),
  };
}

function hashFredSeries(seriesId: string, sourceUrl: string, observations: FredObservation[]): string {
  return sha256({
    sourceId: "fred_alfred",
    seriesId: seriesId.toUpperCase(),
    sourceUrl,
    observationRecordHashes: observations.map((observation) => observation.recordHash),
  });
}
