import { sha256 } from "../hash.js";

export interface OpportunityPublicProgramsRequest {
  keyword: string;
  agencies?: string[];
  limit?: number;
  includeGrants?: boolean;
  includeDataGov?: boolean;
}

export interface OpportunityPublicProgramMatch {
  matchId: string;
  sourceId: "grants_gov" | "data_gov_catalog";
  title: string;
  agency: string | null;
  status: string | null;
  closeDate: string | null;
  openDate: string | null;
  opportunityNumber: string | null;
  sourceUrl: string;
  description: string | null;
  fitSignals: string[];
  recordHash: string;
}

export interface OpportunityPublicProgramsPreview {
  schemaVersion: "aoe.adapter.opportunity_public_programs.preview.v1";
  generatedAt: string;
  query: {
    keyword: string;
    agencies: string[];
    limit: number;
  };
  x402Stream: true;
  productId: "opportunity_intel_pack";
  sources: Array<{
    sourceId: "grants_gov" | "data_gov_catalog" | "sam_gov_opportunities";
    url: string;
    retrievalMode: "read_only_public_api" | "key_required_public_api";
    status: "ok" | "degraded" | "key_required";
    message?: string;
  }>;
  summary: {
    matchCount: number;
    grantsCount: number;
    dataGovCount: number;
    keyRequiredSources: string[];
  };
  matches: OpportunityPublicProgramMatch[];
  caveats: string[];
  outputPolicy: string[];
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const GRANTS_SEARCH_URL = "https://api.grants.gov/v1/api/search2";
const DATA_GOV_SEARCH_URL = "https://catalog.data.gov/search";
const SAM_OPPORTUNITIES_URL = "https://api.sam.gov/opportunities/v2/search";

export async function buildOpportunityPublicProgramsPreview(
  request: OpportunityPublicProgramsRequest,
  fetcher: FetchLike = fetch,
): Promise<OpportunityPublicProgramsPreview> {
  const limit = Math.max(1, Math.min(request.limit ?? 10, 25));
  const agencies = [...new Set((request.agencies ?? []).map((agency) => agency.trim()).filter(Boolean))].slice(0, 10);
  const includeGrants = request.includeGrants ?? true;
  const includeDataGov = request.includeDataGov ?? true;

  const sourceStatuses: OpportunityPublicProgramsPreview["sources"] = [
    {
      sourceId: "sam_gov_opportunities",
      url: SAM_OPPORTUNITIES_URL,
      retrievalMode: "key_required_public_api",
      status: "key_required",
      message: "SAM.gov Get Opportunities Public API requires a public API key, so this preview does not call it by default.",
    },
  ];

  const results = await Promise.all([
    includeGrants
      ? fetchGrantsMatches({ keyword: request.keyword, agencies, limit }, fetcher)
      : Promise.resolve({ matches: [], status: skippedSource("grants_gov", GRANTS_SEARCH_URL) }),
    includeDataGov
      ? fetchDataGovMatches({ keyword: request.keyword, agencies, limit }, fetcher)
      : Promise.resolve({ matches: [], status: skippedSource("data_gov_catalog", DATA_GOV_SEARCH_URL) }),
  ]);

  const matches = results
    .flatMap((result) => result.matches)
    .sort(compareMatches)
    .slice(0, limit);

  sourceStatuses.unshift(...results.map((result) => result.status));

  return {
    schemaVersion: "aoe.adapter.opportunity_public_programs.preview.v1",
    generatedAt: new Date().toISOString(),
    query: {
      keyword: request.keyword,
      agencies,
      limit,
    },
    x402Stream: true,
    productId: "opportunity_intel_pack",
    sources: sourceStatuses,
    summary: {
      matchCount: matches.length,
      grantsCount: matches.filter((match) => match.sourceId === "grants_gov").length,
      dataGovCount: matches.filter((match) => match.sourceId === "data_gov_catalog").length,
      keyRequiredSources: sourceStatuses.filter((source) => source.status === "key_required").map((source) => source.sourceId),
    },
    matches,
    caveats: [
      "This is an opportunity-discovery preview, not a legal eligibility determination.",
      "Deadlines, amendments, eligibility, and application instructions must be verified at the official source before any bid or submission.",
      "SAM.gov opportunity search is listed as key-required and is not called without an explicit API key integration.",
    ],
    outputPolicy: [
      "Return derived metadata, source links, fit signals, and short descriptions only.",
      "Do not resell raw opportunity packages, attachments, or source documents as the paid product.",
      "Do not imply agency endorsement or official eligibility decisions.",
    ],
  };
}

async function fetchGrantsMatches(
  request: { keyword: string; agencies: string[]; limit: number },
  fetcher: FetchLike,
): Promise<{ matches: OpportunityPublicProgramMatch[]; status: OpportunityPublicProgramsPreview["sources"][number] }> {
  try {
    const response = await fetcher(GRANTS_SEARCH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "agent-opportunity-exchange/0.1 read-only opportunity source adapter",
      },
      body: JSON.stringify({
        keyword: request.keyword,
        agencies: request.agencies.join("|"),
        rows: request.limit,
        oppStatuses: "forecasted|posted",
      }),
    });
    if (!response.ok) {
      throw new Error(`Grants.gov search failed: ${response.status}`);
    }

    const body = (await response.json()) as GrantsSearchResponse;
    const matches = (body.data?.oppHits ?? []).slice(0, request.limit).map(summarizeGrantOpportunity);
    return {
      matches,
      status: {
        sourceId: "grants_gov",
        url: GRANTS_SEARCH_URL,
        retrievalMode: "read_only_public_api",
        status: "ok",
      },
    };
  } catch (error) {
    return {
      matches: [],
      status: {
        sourceId: "grants_gov",
        url: GRANTS_SEARCH_URL,
        retrievalMode: "read_only_public_api",
        status: "degraded",
        message: error instanceof Error ? error.message : "Unknown Grants.gov adapter error",
      },
    };
  }
}

async function fetchDataGovMatches(
  request: { keyword: string; agencies: string[]; limit: number },
  fetcher: FetchLike,
): Promise<{ matches: OpportunityPublicProgramMatch[]; status: OpportunityPublicProgramsPreview["sources"][number] }> {
  try {
    const url = new URL(DATA_GOV_SEARCH_URL);
    url.searchParams.set("q", request.keyword);
    url.searchParams.set("per_page", String(request.limit));
    if (request.agencies.length === 1) {
      url.searchParams.set("org_slug", slugifyAgency(request.agencies[0]));
    }

    const response = await fetcher(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "agent-opportunity-exchange/0.1 read-only opportunity source adapter",
      },
    });
    if (!response.ok) {
      throw new Error(`Data.gov catalog search failed: ${response.status}`);
    }

    const body = (await response.json()) as DataGovSearchResponse;
    const matches = (body.results ?? []).slice(0, request.limit).map(summarizeDataGovDataset);
    return {
      matches,
      status: {
        sourceId: "data_gov_catalog",
        url: url.toString(),
        retrievalMode: "read_only_public_api",
        status: "ok",
      },
    };
  } catch (error) {
    return {
      matches: [],
      status: {
        sourceId: "data_gov_catalog",
        url: DATA_GOV_SEARCH_URL,
        retrievalMode: "read_only_public_api",
        status: "degraded",
        message: error instanceof Error ? error.message : "Unknown Data.gov adapter error",
      },
    };
  }
}

function summarizeGrantOpportunity(row: GrantsOpportunityHit): OpportunityPublicProgramMatch {
  const sourceUrl = `https://www.grants.gov/search-results-detail/${encodeURIComponent(String(row.id ?? row.number ?? ""))}`;
  const summary = {
    sourceId: "grants_gov",
    id: row.id,
    number: row.number,
    title: row.title,
    agency: row.agency,
    status: row.oppStatus,
    openDate: row.openDate,
    closeDate: row.closeDate,
    cfdaList: row.cfdaList,
  };
  return {
    matchId: `grants_gov:${row.id ?? row.number ?? row.title}`,
    sourceId: "grants_gov",
    title: cleanString(row.title) ?? "Untitled Grants.gov opportunity",
    agency: cleanString(row.agency),
    status: cleanString(row.oppStatus),
    closeDate: cleanString(row.closeDate),
    openDate: cleanString(row.openDate),
    opportunityNumber: cleanString(row.number),
    sourceUrl,
    description: row.cfdaList?.length ? `Assistance listings: ${row.cfdaList.join(", ")}` : null,
    fitSignals: grantFitSignals(row),
    recordHash: sha256(summary),
  };
}

function summarizeDataGovDataset(row: DataGovDataset): OpportunityPublicProgramMatch {
  const landingPage = cleanString(row.dcat?.landingPage) ?? cleanString(row.harvest_record) ?? "https://catalog.data.gov/";
  const publisher = cleanString(row.publisher) ?? cleanString(row.organization?.name) ?? cleanString(row.dcat?.publisher?.name);
  const description = truncate(cleanString(row.description) ?? cleanString(row.dcat?.description), 280);
  const summary = {
    sourceId: "data_gov_catalog",
    identifier: row.identifier,
    title: row.title ?? row.dcat?.title,
    publisher,
    lastHarvested: row.last_harvested_date,
    landingPage,
  };
  return {
    matchId: `data_gov_catalog:${row.identifier ?? row.slug ?? row.title}`,
    sourceId: "data_gov_catalog",
    title: cleanString(row.title) ?? cleanString(row.dcat?.title) ?? "Untitled Data.gov dataset",
    agency: publisher,
    status: cleanString(row.dcat?.accessLevel) ?? "public_metadata",
    closeDate: null,
    openDate: cleanString(row.last_harvested_date) ?? cleanString(row.dcat?.modified),
    opportunityNumber: cleanString(row.identifier),
    sourceUrl: landingPage,
    description,
    fitSignals: dataGovFitSignals(row),
    recordHash: sha256(summary),
  };
}

function grantFitSignals(row: GrantsOpportunityHit): string[] {
  return [
    row.oppStatus === "posted" ? "posted_opportunity" : null,
    row.oppStatus === "forecasted" ? "forecasted_opportunity" : null,
    row.closeDate ? "deadline_present" : null,
    row.cfdaList?.length ? "assistance_listing_present" : null,
    row.agency ? "agency_named" : null,
  ].filter((signal): signal is string => Boolean(signal));
}

function dataGovFitSignals(row: DataGovDataset): string[] {
  return [
    row.dcat?.accessLevel === "public" ? "public_dataset_metadata" : null,
    row.last_harvested_date ? "harvest_timestamp_present" : null,
    row.keyword?.length ? "keyword_overlap" : null,
    row.distribution_titles?.length ? "distribution_metadata_present" : null,
    row.has_spatial ? "geospatial_dataset" : null,
  ].filter((signal): signal is string => Boolean(signal));
}

function compareMatches(left: OpportunityPublicProgramMatch, right: OpportunityPublicProgramMatch): number {
  const sourceRank = sourceScore(right.sourceId) - sourceScore(left.sourceId);
  if (sourceRank !== 0) return sourceRank;
  return (left.closeDate ?? "9999").localeCompare(right.closeDate ?? "9999");
}

function sourceScore(sourceId: OpportunityPublicProgramMatch["sourceId"]): number {
  return sourceId === "grants_gov" ? 2 : 1;
}

function skippedSource(sourceId: "grants_gov" | "data_gov_catalog", url: string): OpportunityPublicProgramsPreview["sources"][number] {
  return {
    sourceId,
    url,
    retrievalMode: "read_only_public_api",
    status: "degraded",
    message: "Source skipped by request flag.",
  };
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function truncate(value: string | null, maxLength: number): string | null {
  if (!value) return null;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function slugifyAgency(agency: string): string {
  return agency
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface GrantsSearchResponse {
  data?: {
    oppHits?: GrantsOpportunityHit[];
  };
}

interface GrantsOpportunityHit {
  id?: string;
  number?: string;
  title?: string;
  agencyCode?: string;
  agency?: string;
  openDate?: string;
  closeDate?: string;
  oppStatus?: string;
  docType?: string;
  cfdaList?: string[];
}

interface DataGovSearchResponse {
  results?: DataGovDataset[];
}

interface DataGovDataset {
  title?: string;
  description?: string;
  identifier?: string;
  slug?: string;
  publisher?: string;
  keyword?: string[];
  distribution_titles?: string[];
  last_harvested_date?: string;
  has_spatial?: boolean;
  harvest_record?: string;
  organization?: {
    name?: string;
    slug?: string;
  };
  dcat?: {
    title?: string;
    description?: string;
    accessLevel?: string;
    modified?: string;
    landingPage?: string;
    publisher?: {
      name?: string;
    };
  };
}
