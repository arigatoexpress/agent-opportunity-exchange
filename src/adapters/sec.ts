export interface SecFilingRequest {
  ticker?: string;
  cik?: string;
  forms?: string[];
  limit?: number;
}

export interface SecRecentFiling {
  form: string;
  filingDate: string;
  reportDate: string | null;
  accessionNumber: string;
  primaryDocument: string | null;
  archiveUrl: string | null;
}

export interface SecFilingsReport {
  generatedAt: string;
  query: SecFilingRequest;
  company: {
    cik: string;
    ticker: string | null;
    name: string;
  };
  source: {
    sourceId: "sec_edgar";
    submissionsUrl: string;
    tickerMapUrl?: string;
    retrievalMode: "read_only_public_api";
  };
  filings: SecRecentFiling[];
  caveats: string[];
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_SUBMISSIONS_BASE = "https://data.sec.gov/submissions";

export async function fetchSecRecentFilings(request: SecFilingRequest, fetcher: FetchLike = fetch): Promise<SecFilingsReport> {
  const limit = Math.max(1, Math.min(request.limit ?? 10, 50));
  const identity = await resolveCompanyIdentity(request, fetcher);
  const submissionsUrl = `${SEC_SUBMISSIONS_BASE}/CIK${identity.cik}.json`;
  const response = await fetcher(submissionsUrl, {
    headers: secHeaders(),
  });
  if (!response.ok) {
    throw new Error(`SEC submissions request failed: ${response.status}`);
  }

  const body = (await response.json()) as SecSubmissionsResponse;
  const forms = new Set((request.forms ?? []).map((form) => form.toUpperCase()));
  const recent = body.filings?.recent;
  const rows: SecRecentFiling[] = [];
  if (recent) {
    for (let index = 0; index < recent.accessionNumber.length; index += 1) {
      const form = recent.form[index] ?? "UNKNOWN";
      if (forms.size > 0 && !forms.has(form.toUpperCase())) continue;
      const accessionNumber = recent.accessionNumber[index] ?? "";
      const primaryDocument = recent.primaryDocument[index] ?? null;
      rows.push({
        form,
        filingDate: recent.filingDate[index] ?? "",
        reportDate: recent.reportDate[index] || null,
        accessionNumber,
        primaryDocument,
        archiveUrl: buildArchiveUrl(identity.cik, accessionNumber, primaryDocument),
      });
      if (rows.length >= limit) break;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    query: request,
    company: {
      cik: identity.cik,
      ticker: identity.ticker,
      name: body.name ?? identity.name,
    },
    source: {
      sourceId: "sec_edgar",
      submissionsUrl,
      tickerMapUrl: request.ticker ? SEC_TICKERS_URL : undefined,
      retrievalMode: "read_only_public_api",
    },
    filings: rows,
    caveats: [
      "This is document intelligence from public SEC EDGAR APIs, not investment advice.",
      "Filing dates, form types, and primary document links should be verified at SEC source before business decisions.",
      "The adapter does not personalize recommendations, produce price targets, or execute trades.",
    ],
  };
}

async function resolveCompanyIdentity(request: SecFilingRequest, fetcher: FetchLike): Promise<{ cik: string; ticker: string | null; name: string }> {
  if (request.cik) {
    return {
      cik: normalizeCik(request.cik),
      ticker: request.ticker?.toUpperCase() ?? null,
      name: request.ticker?.toUpperCase() ?? `CIK ${normalizeCik(request.cik)}`,
    };
  }

  if (!request.ticker) {
    throw new Error("Provide ticker or cik.");
  }

  const response = await fetcher(SEC_TICKERS_URL, {
    headers: secHeaders(),
  });
  if (!response.ok) {
    throw new Error(`SEC ticker map request failed: ${response.status}`);
  }
  const body = (await response.json()) as Record<string, { cik_str: number; ticker: string; title: string }>;
  const match = Object.values(body).find((entry) => entry.ticker.toUpperCase() === request.ticker?.toUpperCase());
  if (!match) {
    throw new Error(`Ticker not found in SEC ticker map: ${request.ticker}`);
  }
  return {
    cik: normalizeCik(String(match.cik_str)),
    ticker: match.ticker.toUpperCase(),
    name: match.title,
  };
}

function normalizeCik(cik: string): string {
  return cik.replace(/\D/g, "").padStart(10, "0");
}

function buildArchiveUrl(cik: string, accessionNumber: string, primaryDocument: string | null): string | null {
  if (!accessionNumber || !primaryDocument) return null;
  const cikNumber = String(Number.parseInt(cik, 10));
  const accessionNoDashes = accessionNumber.replaceAll("-", "");
  return `https://www.sec.gov/Archives/edgar/data/${cikNumber}/${accessionNoDashes}/${primaryDocument}`;
}

function secHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "User-Agent": process.env.AOE_SEC_USER_AGENT ?? "agent-opportunity-exchange/0.1 local-research contact: aribs",
  };
}

interface SecSubmissionsResponse {
  name?: string;
  filings?: {
    recent?: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
    };
  };
}
