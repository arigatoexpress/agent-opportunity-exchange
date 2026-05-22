import { sha256 } from "../hash.js";

export const CYBER_PUBLIC_CVE_REFRESH_SCHEMA_ID = "aoe.cyber_public_cve_refresh.v1";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface CyberPublicCveRefreshReport {
  schemaId: typeof CYBER_PUBLIC_CVE_REFRESH_SCHEMA_ID;
  generatedAt: string;
  mode: "read_only_public_cve_refresh";
  cves: string[];
  requestedCveCount: number;
  returnedCveCount: number;
  truncatedCveCount: number;
  sourceResults: Array<{
    sourceId: "cisa_kev" | "first_epss" | "nvd_cve" | "osv";
    status: "ok" | "degraded";
    retrievedAt: string;
    ttlSeconds: number;
    errorCode: string | null;
    cacheStatus: "hit" | "miss" | "bypass";
    durationMs: number;
  }>;
  records: Array<{
    cve: string;
    kev: {
      knownExploited: boolean;
      vendorProject: string | null;
      product: string | null;
      vulnerabilityName: string | null;
      dateAdded: string | null;
      dueDate: string | null;
      requiredAction: string | null;
    };
    epss: {
      score: number | null;
      percentile: number | null;
      date: string | null;
    };
    nvd: {
      found: boolean;
      published: string | null;
      lastModified: string | null;
      status: string | null;
      severity: string | null;
      baseScore: number | null;
      description: string | null;
      referenceCount: number;
    };
    osv: {
      found: boolean;
      id: string | null;
      modified: string | null;
      published: string | null;
      summary: string | null;
      aliasCount: number;
      affectedPackageCount: number;
      referenceCount: number;
    };
    sourceIds: string[];
    caveats: string[];
  }>;
  safety: {
    readOnly: true;
    sideEffects: "public_cve_source_fetch_only";
    privateDataSent: false;
    hostnamesSent: false;
    activeScanningAllowed: false;
    exploitPayloadGenerationAllowed: false;
    rawSourceRedistribution: false;
    outputPolicy: string[];
  };
  evidenceProof: {
    algorithm: "sha256";
    canonicalization: "stable-json-sorted-keys-v1";
    reportHash: string;
  };
}

interface CisaKevFeed {
  vulnerabilities?: Array<{
    cveID?: string;
    vendorProject?: string;
    product?: string;
    vulnerabilityName?: string;
    dateAdded?: string;
    dueDate?: string;
    requiredAction?: string;
  }>;
}

type CisaKevRecord = {
  cveID: string;
  vendorProject: string | null;
  product: string | null;
  vulnerabilityName: string | null;
  dateAdded: string | null;
  dueDate: string | null;
  requiredAction: string | null;
};

interface FirstEpssResponse {
  data?: Array<{
    cve?: string;
    epss?: string;
    percentile?: string;
    date?: string;
  }>;
}

interface NvdCveResponse {
  vulnerabilities?: Array<{
    cve?: {
      id?: string;
      published?: string;
      lastModified?: string;
      vulnStatus?: string;
      descriptions?: Array<{ lang?: string; value?: string }>;
      references?: unknown[] | { referenceData?: unknown[] };
      metrics?: {
        cvssMetricV40?: Array<{ cvssData?: { baseScore?: number; baseSeverity?: string } }>;
        cvssMetricV31?: Array<{ cvssData?: { baseScore?: number; baseSeverity?: string } }>;
        cvssMetricV30?: Array<{ cvssData?: { baseScore?: number; baseSeverity?: string } }>;
        cvssMetricV2?: Array<{ cvssData?: { baseScore?: number }; baseSeverity?: string }>;
      };
    };
  }>;
}

type NvdCve = NonNullable<NonNullable<NvdCveResponse["vulnerabilities"]>[number]["cve"]>;

interface OsvVulnerabilityResponse {
  id?: string;
  modified?: string;
  published?: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  affected?: unknown[];
  references?: unknown[];
}

type NvdRecord = {
  found: boolean;
  published: string | null;
  lastModified: string | null;
  status: string | null;
  severity: string | null;
  baseScore: number | null;
  description: string | null;
  referenceCount: number;
};

type OsvRecord = {
  found: boolean;
  id: string | null;
  modified: string | null;
  published: string | null;
  summary: string | null;
  aliasCount: number;
  affectedPackageCount: number;
  referenceCount: number;
};

const CVE_PATTERN = /^CVE-\d{4}-\d{4,}$/i;
const CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const FIRST_EPSS_URL = "https://api.first.org/data/v1/epss";
const NVD_CVE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const OSV_VULNS_URL = "https://api.osv.dev/v1/vulns";
const PUBLIC_CVE_CACHE_TTL_MS = 86_400_000;

const publicCveJsonCache = new Map<string, { expiresAt: number; value: unknown }>();

export function clearCyberPublicCveCache(): void {
  publicCveJsonCache.clear();
}

export async function fetchCyberPublicCveRefresh(
  cves: string[],
  fetcher: FetchLike = fetch,
  timeoutMs = 5_000,
): Promise<CyberPublicCveRefreshReport> {
  const { normalizedCves, requestedCveCount, truncatedCveCount } = normalizeCves(cves);
  const generatedAt = new Date().toISOString();
  const [kevResult, epssResult, nvdResult, osvResult] = await Promise.all([
    fetchCisaKev(normalizedCves, fetcher, timeoutMs),
    fetchFirstEpss(normalizedCves, fetcher, timeoutMs),
    fetchNvdCves(normalizedCves, fetcher, timeoutMs),
    fetchOsvCves(normalizedCves, fetcher, timeoutMs),
  ]);

  const records = normalizedCves.map((cve) => {
    const kev = kevResult.records.get(cve);
    const epss = epssResult.records.get(cve);
    const nvd = nvdResult.records.get(cve);
    const osv = osvResult.records.get(cve);
    return {
      cve,
      kev: {
        knownExploited: Boolean(kev),
        vendorProject: kev?.vendorProject ?? null,
        product: kev?.product ?? null,
        vulnerabilityName: kev?.vulnerabilityName ?? null,
        dateAdded: kev?.dateAdded ?? null,
        dueDate: kev?.dueDate ?? null,
        requiredAction: kev?.requiredAction ?? null,
      },
      epss: {
        score: epss?.score ?? null,
        percentile: epss?.percentile ?? null,
        date: epss?.date ?? null,
      },
      nvd: nvd ?? emptyNvdRecord(),
      osv: osv ?? emptyOsvRecord(),
      sourceIds: [
        ...(kev ? ["cisa_kev"] : []),
        ...(epss ? ["first_epss"] : []),
        ...(nvd?.found ? ["nvd_cve"] : []),
        ...(osv?.found ? ["osv"] : []),
      ],
      caveats: buildRecordCaveats(Boolean(kev), Boolean(epss), Boolean(nvd?.found), Boolean(osv?.found)),
    };
  });

  const withoutProof = {
    schemaId: CYBER_PUBLIC_CVE_REFRESH_SCHEMA_ID as typeof CYBER_PUBLIC_CVE_REFRESH_SCHEMA_ID,
    generatedAt,
    mode: "read_only_public_cve_refresh" as const,
    cves: normalizedCves,
    requestedCveCount,
    returnedCveCount: normalizedCves.length,
    truncatedCveCount,
    sourceResults: [
      {
        sourceId: "cisa_kev" as const,
        status: kevResult.status,
        retrievedAt: generatedAt,
        ttlSeconds: 86_400,
        errorCode: kevResult.errorCode,
        cacheStatus: kevResult.cacheStatus,
        durationMs: kevResult.durationMs,
      },
      {
        sourceId: "first_epss" as const,
        status: epssResult.status,
        retrievedAt: generatedAt,
        ttlSeconds: 86_400,
        errorCode: epssResult.errorCode,
        cacheStatus: epssResult.cacheStatus,
        durationMs: epssResult.durationMs,
      },
      {
        sourceId: "nvd_cve" as const,
        status: nvdResult.status,
        retrievedAt: generatedAt,
        ttlSeconds: 86_400,
        errorCode: nvdResult.errorCode,
        cacheStatus: nvdResult.cacheStatus,
        durationMs: nvdResult.durationMs,
      },
      {
        sourceId: "osv" as const,
        status: osvResult.status,
        retrievedAt: generatedAt,
        ttlSeconds: 86_400,
        errorCode: osvResult.errorCode,
        cacheStatus: osvResult.cacheStatus,
        durationMs: osvResult.durationMs,
      },
    ],
    records,
    safety: {
      readOnly: true as const,
      sideEffects: "public_cve_source_fetch_only" as const,
      privateDataSent: false as const,
      hostnamesSent: false as const,
      activeScanningAllowed: false as const,
      exploitPayloadGenerationAllowed: false as const,
      rawSourceRedistribution: false as const,
      outputPolicy: [
        "Query public CVE identifiers only.",
        "Do not send buyer inventory, hostnames, secrets, wallets, notes, or customer identifiers to public sources.",
        "Use KEV, EPSS, NVD, and OSV as prioritization evidence, not proof of buyer exploitability.",
        "Refresh vendor advisories before final remediation claims.",
      ],
    },
  };

  return {
    ...withoutProof,
    evidenceProof: {
      algorithm: "sha256",
      canonicalization: "stable-json-sorted-keys-v1",
      reportHash: sha256(withoutProof),
    },
  };
}

function normalizeCves(cves: string[]): { normalizedCves: string[]; requestedCveCount: number; truncatedCveCount: number } {
  const validCves = [...new Set(cves.filter((cve) => CVE_PATTERN.test(cve)).map((cve) => cve.toUpperCase()))].sort();
  const normalizedCves = validCves.slice(0, 50);
  return {
    normalizedCves,
    requestedCveCount: validCves.length,
    truncatedCveCount: Math.max(0, validCves.length - normalizedCves.length),
  };
}

async function fetchCisaKev(cves: string[], fetcher: FetchLike, timeoutMs: number) {
  if (cves.length === 0) return sourceResult<CisaKevRecord>("ok", null, new Map(), "bypass", 0);
  const started = Date.now();
  try {
    const { body, cacheStatus } = await fetchJsonWithCache<CisaKevFeed>("cisa_kev:feed", CISA_KEV_URL, fetcher, timeoutMs);
    const wanted = new Set(cves);
    const records = new Map<string, CisaKevRecord>();
    for (const row of body.vulnerabilities ?? []) {
      const cve = row.cveID?.toUpperCase();
      if (cve && wanted.has(cve)) {
        records.set(cve, {
          cveID: cve,
          vendorProject: shortText(row.vendorProject),
          product: shortText(row.product),
          vulnerabilityName: shortText(row.vulnerabilityName),
          dateAdded: shortText(row.dateAdded, 40),
          dueDate: shortText(row.dueDate, 40),
          requiredAction: shortText(row.requiredAction, 220),
        });
      }
    }
    return sourceResult("ok", null, records, cacheStatus, Date.now() - started);
  } catch {
    return sourceResult<CisaKevRecord>("degraded", "cisa_kev_fetch_failed", new Map(), cacheMode(fetcher), Date.now() - started);
  }
}

async function fetchFirstEpss(cves: string[], fetcher: FetchLike, timeoutMs: number) {
  if (cves.length === 0) return sourceResult<{ score: number | null; percentile: number | null; date: string | null }>("ok", null, new Map(), "bypass", 0);
  const started = Date.now();
  try {
    const url = new URL(FIRST_EPSS_URL);
    url.searchParams.set("cve", cves.join(","));
    const { body, cacheStatus } = await fetchJsonWithCache<FirstEpssResponse>(`first_epss:${cves.join(",")}`, url.toString(), fetcher, timeoutMs);
    const records = new Map<string, { score: number | null; percentile: number | null; date: string | null }>();
    for (const row of body.data ?? []) {
      const cve = row.cve?.toUpperCase();
      if (!cve || !cves.includes(cve)) continue;
      records.set(cve, {
        score: parseNumeric(row.epss),
        percentile: parseNumeric(row.percentile),
        date: shortText(row.date, 40),
      });
    }
    return sourceResult("ok", null, records, cacheStatus, Date.now() - started);
  } catch {
    return sourceResult<{ score: number | null; percentile: number | null; date: string | null }>(
      "degraded",
      "first_epss_fetch_failed",
      new Map(),
      cacheMode(fetcher),
      Date.now() - started,
    );
  }
}

async function fetchNvdCves(cves: string[], fetcher: FetchLike, timeoutMs: number) {
  if (cves.length === 0) return sourceResult<NvdRecord>("ok", null, new Map(), "bypass", 0);
  const started = Date.now();
  try {
    const url = new URL(NVD_CVE_URL);
    url.searchParams.set("cveIds", cves.join(","));
    url.searchParams.set("noRejected", "");
    const { body, cacheStatus } = await fetchJsonWithCache<NvdCveResponse>(`nvd_cve:${cves.join(",")}`, url.toString(), fetcher, timeoutMs);
    const records = new Map<string, NvdRecord>();
    for (const row of body.vulnerabilities ?? []) {
      const cve = row.cve?.id?.toUpperCase();
      if (!cve || !cves.includes(cve)) continue;
      const metric = firstMetric(row.cve?.metrics);
      records.set(cve, {
        found: true,
        published: shortText(row.cve?.published, 40),
        lastModified: shortText(row.cve?.lastModified, 40),
        status: shortText(row.cve?.vulnStatus, 60),
        severity: shortText(metric.severity, 20),
        baseScore: metric.baseScore,
        description: shortText(row.cve?.descriptions?.find((description) => description.lang === "en")?.value, 280),
        referenceCount: referenceCount(row.cve?.references),
      });
    }
    return sourceResult("ok", null, records, cacheStatus, Date.now() - started);
  } catch {
    return sourceResult<NvdRecord>("degraded", "nvd_cve_fetch_failed", new Map(), cacheMode(fetcher), Date.now() - started);
  }
}

async function fetchOsvCves(cves: string[], fetcher: FetchLike, timeoutMs: number) {
  if (cves.length === 0) return sourceResult<OsvRecord>("ok", null, new Map(), "bypass", 0);
  const started = Date.now();
  const responses = await mapWithConcurrency(cves, 5, async (cve) => {
    try {
      const { body, cacheStatus } = await fetchJsonWithCache<OsvVulnerabilityResponse | null>(
        `osv:${cve}`,
        `${OSV_VULNS_URL}/${encodeURIComponent(cve)}`,
        fetcher,
        timeoutMs,
        true,
      );
      if (!body) return { cve, record: emptyOsvRecord(), cacheStatus, ok: true };
      return {
        cve,
        record: {
          found: true,
          id: shortText(body.id, 80),
          modified: shortText(body.modified, 40),
          published: shortText(body.published, 40),
          summary: shortText(body.summary ?? body.details, 240),
          aliasCount: body.aliases?.length ?? 0,
          affectedPackageCount: body.affected?.length ?? 0,
          referenceCount: body.references?.length ?? 0,
        },
        cacheStatus,
        ok: true,
      };
    } catch {
      return { cve, record: emptyOsvRecord(), cacheStatus: cacheMode(fetcher), ok: false };
    }
  });
  const failedCount = responses.filter((response) => !response.ok).length;
  const status = failedCount > 0 ? "degraded" : "ok";
  const errorCode = failedCount === 0 ? null : failedCount === responses.length ? "osv_fetch_failed" : "osv_partial_fetch_failed";
  return sourceResult(
    status,
    errorCode,
    new Map(responses.map((response) => [response.cve, response.record])),
    aggregateCacheStatus(responses.map((response) => response.cacheStatus)),
    Date.now() - started,
  );
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]!);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchWithTimeout(url: string, init: RequestInit, fetcher: FetchLike, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": "agent-opportunity-exchange/0.1 public-cve-refresh",
        ...(init.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithCache<T>(
  cacheKey: string,
  url: string,
  fetcher: FetchLike,
  timeoutMs: number,
  nullOn404 = false,
): Promise<{ body: T; cacheStatus: "hit" | "miss" | "bypass" }> {
  if (cacheMode(fetcher) === "miss") {
    const cached = publicCveJsonCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { body: cached.value as T, cacheStatus: "hit" };
    }
  }

  const response = await fetchWithTimeout(url, { method: "GET", headers: { Accept: "application/json" } }, fetcher, timeoutMs);
  if (response.status === 404 && nullOn404) {
    const value = null as T;
    if (cacheMode(fetcher) === "miss") publicCveJsonCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_CVE_CACHE_TTL_MS, value });
    return { body: value, cacheStatus: cacheMode(fetcher) };
  }
  if (!response.ok) throw new Error("public_cve_http_error");
  const body = (await response.json()) as T;
  if (cacheMode(fetcher) === "miss") publicCveJsonCache.set(cacheKey, { expiresAt: Date.now() + PUBLIC_CVE_CACHE_TTL_MS, value: body });
  return { body, cacheStatus: cacheMode(fetcher) };
}

function cacheMode(fetcher: FetchLike): "miss" | "bypass" {
  return fetcher === fetch ? "miss" : "bypass";
}

function aggregateCacheStatus(statuses: Array<"hit" | "miss" | "bypass">): "hit" | "miss" | "bypass" {
  if (statuses.length === 0) return "bypass";
  if (statuses.every((status) => status === "hit")) return "hit";
  if (statuses.every((status) => status === "bypass")) return "bypass";
  return "miss";
}

function sourceResult<T>(
  status: "ok" | "degraded",
  errorCode: string | null,
  records: Map<string, T>,
  cacheStatus: "hit" | "miss" | "bypass",
  durationMs: number,
) {
  return { status, errorCode, records, cacheStatus, durationMs };
}

function buildRecordCaveats(hasKev: boolean, hasEpss: boolean, hasNvd: boolean, hasOsv: boolean): string[] {
  return [
    hasKev ? "CVE appears in CISA KEV; confirm buyer affectedness and change-window requirements." : "CVE was not found in the fetched CISA KEV snapshot.",
    hasEpss ? "EPSS is exploit-probability evidence, not buyer exploitability proof." : "EPSS score was not returned for this CVE.",
    hasNvd ? "NVD metadata is present; confirm vendor applicability before remediation claims." : "NVD metadata was not returned for this CVE.",
    hasOsv ? "OSV metadata is present; map package ecosystem before dependency remediation claims." : "OSV metadata was not returned for this CVE.",
    "Refresh vendor advisories before final remediation claims.",
  ];
}

function emptyNvdRecord(): NvdRecord {
  return {
    found: false,
    published: null,
    lastModified: null,
    status: null,
    severity: null,
    baseScore: null,
    description: null,
    referenceCount: 0,
  };
}

function emptyOsvRecord(): OsvRecord {
  return {
    found: false,
    id: null,
    modified: null,
    published: null,
    summary: null,
    aliasCount: 0,
    affectedPackageCount: 0,
    referenceCount: 0,
  };
}

function firstMetric(metrics: NvdCve["metrics"] | undefined) {
  const v4 = metrics?.cvssMetricV40?.[0]?.cvssData;
  if (v4) return { baseScore: numberOrNull(v4.baseScore), severity: v4.baseSeverity };
  const v31 = metrics?.cvssMetricV31?.[0]?.cvssData;
  if (v31) return { baseScore: numberOrNull(v31.baseScore), severity: v31.baseSeverity };
  const v30 = metrics?.cvssMetricV30?.[0]?.cvssData;
  if (v30) return { baseScore: numberOrNull(v30.baseScore), severity: v30.baseSeverity };
  const v2 = metrics?.cvssMetricV2?.[0];
  if (v2) return { baseScore: numberOrNull(v2.cvssData?.baseScore), severity: v2.baseSeverity };
  return { baseScore: null, severity: undefined };
}

function parseNumeric(value: string | undefined): number | null {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function referenceCount(value: NvdCve["references"] | undefined): number {
  if (Array.isArray(value)) return value.length;
  return value?.referenceData?.length ?? 0;
}

function shortText(value: string | undefined, maxLength = 120): string | null {
  const text = value?.trim().replace(/\s+/g, " ");
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}
