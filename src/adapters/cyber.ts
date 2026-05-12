import { parseCyberInventory, type CyberAssetEvidence, type CyberInventoryContext } from "../inputs/cyber-inventory.js";

export interface KevEntry {
  cveID: string;
  vendorProject?: string;
  product?: string;
  vulnerabilityName?: string;
  dateAdded?: string;
  dueDate?: string;
  requiredAction?: string;
  knownRansomwareCampaignUse?: string;
  notes?: string;
}

export interface EpssEntry {
  cve: string;
  epss: string;
  percentile: string;
  date?: string;
}

export interface NvdSummary {
  cve: string;
  published?: string;
  lastModified?: string;
  baseScore: number | null;
  baseSeverity: string | null;
  description: string | null;
}

export interface VulnPriorityFinding {
  cve: string;
  tier: "fix_today" | "fix_this_week" | "monitor" | "needs_review";
  reason: string;
  kev: {
    knownExploited: boolean;
    dateAdded?: string;
    dueDate?: string;
    vendorProject?: string;
    product?: string;
    requiredAction?: string;
    knownRansomwareCampaignUse?: string;
  };
  epss: {
    score: number | null;
    percentile: number | null;
    date?: string;
  };
  nvd: NvdSummary | null;
  outputPolicy: string[];
}

export interface VulnPriorityReport {
  generatedAt: string;
  inputCount: number;
  sources: Array<{
    sourceId: string;
    url: string;
    retrievalMode: "read_only_public_api";
  }>;
  findings: VulnPriorityFinding[];
  caveats: string[];
}

export interface CyberInventoryPriorityFinding extends VulnPriorityFinding {
  buyerEvidence: {
    affectedAssetCount: number;
    affectedAssets: CyberAssetEvidence[];
    exposureSignals: string[];
    buyerPriorityReason: string;
  };
}

export interface CyberInventoryPriorityPreview {
  schemaVersion: "sapphirealpha.cyber_inventory_priority.preview.v1";
  generatedAt: string;
  input: {
    buyer?: {
      buyerId?: string;
      name?: string;
      useCase?: string;
    };
    cveCount: number;
    assetRows: number;
    authorizedInventoryRequired: true;
  };
  sources: VulnPriorityReport["sources"];
  summary: {
    fixToday: number;
    fixThisWeek: number;
    monitor: number;
    needsReview: number;
    affectedAssets: number;
  };
  findings: CyberInventoryPriorityFinding[];
  caveats: string[];
  outputPolicy: string[];
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const EPSS_URL = "https://api.first.org/data/v1/epss";
const NVD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

export async function fetchKevCatalog(fetcher: FetchLike = fetch): Promise<Map<string, KevEntry>> {
  const response = await fetcher(KEV_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "agent-opportunity-exchange/0.1 read-only source adapter",
    },
  });
  if (!response.ok) {
    throw new Error(`CISA KEV request failed: ${response.status}`);
  }

  const body = (await response.json()) as { vulnerabilities?: KevEntry[] };
  const entries = body.vulnerabilities ?? [];
  return new Map(entries.map((entry) => [entry.cveID.toUpperCase(), entry]));
}

export async function fetchEpssScores(cves: string[], fetcher: FetchLike = fetch): Promise<Map<string, EpssEntry>> {
  if (cves.length === 0) return new Map();

  const url = new URL(EPSS_URL);
  url.searchParams.set("cve", cves.map((cve) => cve.toUpperCase()).join(","));

  const response = await fetcher(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "agent-opportunity-exchange/0.1 read-only source adapter",
    },
  });
  if (!response.ok) {
    throw new Error(`FIRST EPSS request failed: ${response.status}`);
  }

  const body = (await response.json()) as { data?: EpssEntry[] };
  const entries = body.data ?? [];
  return new Map(entries.map((entry) => [entry.cve.toUpperCase(), entry]));
}

export async function fetchNvdSummaries(cves: string[], fetcher: FetchLike = fetch): Promise<Map<string, NvdSummary>> {
  const records = await Promise.all(
    cves.map(async (cve) => {
      const url = new URL(NVD_URL);
      url.searchParams.set("cveId", cve.toUpperCase());
      const response = await fetcher(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "agent-opportunity-exchange/0.1 read-only source adapter",
        },
      });
      if (!response.ok) {
        throw new Error(`NVD request failed for ${cve}: ${response.status}`);
      }

      const body = (await response.json()) as NvdApiResponse;
      const record = body.vulnerabilities?.[0]?.cve;
      if (!record) {
        return {
          cve: cve.toUpperCase(),
          published: undefined,
          lastModified: undefined,
          baseScore: null,
          baseSeverity: null,
          description: null,
        };
      }

      const metric =
        record.metrics?.cvssMetricV31?.[0]?.cvssData ??
        record.metrics?.cvssMetricV30?.[0]?.cvssData ??
        record.metrics?.cvssMetricV2?.[0]?.cvssData;
      const description = record.descriptions?.find((entry) => entry.lang === "en")?.value ?? null;
      return {
        cve: record.id.toUpperCase(),
        published: record.published,
        lastModified: record.lastModified,
        baseScore: typeof metric?.baseScore === "number" ? metric.baseScore : null,
        baseSeverity: metric?.baseSeverity ?? null,
        description: description ? truncate(description, 240) : null,
      };
    }),
  );

  return new Map(records.map((entry) => [entry.cve, entry]));
}

export async function buildVulnPriorityReport(cves: string[], fetcher: FetchLike = fetch): Promise<VulnPriorityReport> {
  const normalized = [...new Set(cves.map((cve) => cve.toUpperCase()))].sort();
  const [kev, epss, nvd] = await Promise.all([fetchKevCatalog(fetcher), fetchEpssScores(normalized, fetcher), fetchNvdSummaries(normalized, fetcher)]);

  const findings = normalized
    .map((cve): VulnPriorityFinding => {
      const kevEntry = kev.get(cve);
      const epssEntry = epss.get(cve);
      const nvdEntry = nvd.get(cve) ?? null;
      const epssScore = epssEntry ? Number.parseFloat(epssEntry.epss) : null;
      const percentile = epssEntry ? Number.parseFloat(epssEntry.percentile) : null;
      const tier = rankTier(Boolean(kevEntry), epssScore, percentile, nvdEntry?.baseSeverity ?? null);
      return {
        cve,
        tier,
        reason: explainTier(tier, Boolean(kevEntry), epssScore, percentile),
        kev: {
          knownExploited: Boolean(kevEntry),
          dateAdded: kevEntry?.dateAdded,
          dueDate: kevEntry?.dueDate,
          vendorProject: kevEntry?.vendorProject,
          product: kevEntry?.product,
          requiredAction: kevEntry?.requiredAction,
          knownRansomwareCampaignUse: kevEntry?.knownRansomwareCampaignUse,
        },
        epss: {
          score: Number.isFinite(epssScore) ? epssScore : null,
          percentile: Number.isFinite(percentile) ? percentile : null,
          date: epssEntry?.date,
        },
        nvd: nvdEntry,
        outputPolicy: [
          "Defensive prioritization only.",
          "No exploit payloads, proof-of-concept instructions, credentials, or unauthorized scanning.",
          "Verify affected assets and vendor remediation guidance before change windows.",
        ],
      };
    })
    .sort(compareFindings);

  return {
    generatedAt: new Date().toISOString(),
    inputCount: normalized.length,
    sources: [
      { sourceId: "cisa_kev", url: KEV_URL, retrievalMode: "read_only_public_api" },
      { sourceId: "first_epss", url: EPSS_URL, retrievalMode: "read_only_public_api" },
      { sourceId: "nvd_cve", url: NVD_URL, retrievalMode: "read_only_public_api" },
    ],
    findings,
    caveats: [
      "This report ranks public exploit evidence, exploit probability, and NVD severity; it does not prove exploitability in a specific environment.",
      "Asset exposure, compensating controls, and vendor-specific remediation should be checked before final prioritization.",
      "No active scan was performed by this adapter.",
    ],
  };
}

export async function buildCyberInventoryPriorityPreview(body: unknown, fetcher: FetchLike = fetch): Promise<CyberInventoryPriorityPreview> {
  const inventory = parseCyberInventory(body);
  return buildCyberInventoryPriorityPreviewFromContext(inventory, fetcher);
}

export async function buildCyberInventoryPriorityPreviewFromContext(
  inventory: CyberInventoryContext,
  fetcher: FetchLike = fetch,
): Promise<CyberInventoryPriorityPreview> {
  const report = await buildVulnPriorityReport(inventory.cves, fetcher);
  const findings = report.findings.map((finding): CyberInventoryPriorityFinding => {
    const affectedAssets = dedupeAssets(inventory.assetsByCve.get(finding.cve) ?? []);
    const exposureSignals = exposureSignalsForAssets(affectedAssets);
    return {
      ...finding,
      buyerEvidence: {
        affectedAssetCount: affectedAssets.length,
        affectedAssets,
        exposureSignals,
        buyerPriorityReason: buyerPriorityReason(finding, affectedAssets, exposureSignals),
      },
    };
  });

  return {
    schemaVersion: "sapphirealpha.cyber_inventory_priority.preview.v1",
    generatedAt: report.generatedAt,
    input: {
      buyer: inventory.buyer,
      cveCount: inventory.cves.length,
      assetRows: inventory.assetRows,
      authorizedInventoryRequired: true,
    },
    sources: report.sources,
    summary: {
      fixToday: findings.filter((finding) => finding.tier === "fix_today").length,
      fixThisWeek: findings.filter((finding) => finding.tier === "fix_this_week").length,
      monitor: findings.filter((finding) => finding.tier === "monitor").length,
      needsReview: findings.filter((finding) => finding.tier === "needs_review").length,
      affectedAssets: new Set(findings.flatMap((finding) => finding.buyerEvidence.affectedAssets.map((asset) => asset.label))).size,
    },
    findings,
    caveats: [
      ...report.caveats,
      "Buyer asset evidence is derived only from the submitted inventory payload; this endpoint does not scan, fingerprint, or validate the environment.",
      "Inventory must be supplied by an authorized buyer or operator for the affected systems.",
    ],
    outputPolicy: [
      "Defensive prioritization only.",
      "No exploit payloads, proof-of-concept instructions, credentials, unauthorized scanning, or weaponized reconnaissance.",
      "Return derived prioritization, asset evidence, source ids, and remediation context rather than raw source resale.",
    ],
  };
}

function rankTier(knownExploited: boolean, epssScore: number | null, percentile: number | null, baseSeverity: string | null): VulnPriorityFinding["tier"] {
  if (knownExploited) return "fix_today";
  if ((epssScore ?? 0) >= 0.2 || (percentile ?? 0) >= 0.9) return "fix_this_week";
  if (baseSeverity === "CRITICAL") return "fix_this_week";
  if (epssScore === null && percentile === null) return "needs_review";
  return "monitor";
}

function explainTier(
  tier: VulnPriorityFinding["tier"],
  knownExploited: boolean,
  epssScore: number | null,
  percentile: number | null,
): string {
  if (knownExploited) {
    return "CISA KEV marks this CVE as known exploited; prioritize validation and remediation.";
  }
  if (tier === "fix_this_week") {
    return `EPSS signal is elevated${epssScore === null ? "" : ` at ${epssScore.toFixed(4)}`}${percentile === null ? "" : ` / percentile ${percentile.toFixed(4)}`}.`;
  }
  if (tier === "needs_review") {
    return "No EPSS score was returned for this CVE; verify identifiers and vendor context.";
  }
  return "No KEV match and EPSS signal is not elevated; monitor and patch through normal cadence.";
}

function compareFindings(left: VulnPriorityFinding, right: VulnPriorityFinding): number {
  const tierOrder: Record<VulnPriorityFinding["tier"], number> = {
    fix_today: 0,
    fix_this_week: 1,
    needs_review: 2,
    monitor: 3,
  };
  const tierDelta = tierOrder[left.tier] - tierOrder[right.tier];
  if (tierDelta !== 0) return tierDelta;
  const scoreDelta = (right.nvd?.baseScore ?? -1) - (left.nvd?.baseScore ?? -1);
  if (scoreDelta !== 0) return scoreDelta;
  return (right.epss.score ?? -1) - (left.epss.score ?? -1);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function dedupeAssets(assets: CyberAssetEvidence[]): CyberAssetEvidence[] {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    const key = `${asset.assetId ?? ""}|${asset.hostname ?? ""}|${asset.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function exposureSignalsForAssets(assets: CyberAssetEvidence[]): string[] {
  const signals = new Set<string>();
  if (assets.some((asset) => asset.internetFacing === true)) signals.add("internet_facing_asset");
  if (assets.some((asset) => asset.criticality === "critical" || asset.criticality === "high")) signals.add("high_criticality_asset");
  if (assets.some((asset) => asset.environment?.toLowerCase() === "prod" || asset.environment?.toLowerCase() === "production")) signals.add("production_environment");
  return [...signals].sort();
}

function buyerPriorityReason(finding: VulnPriorityFinding, assets: CyberAssetEvidence[], exposureSignals: string[]): string {
  const assetPhrase = assets.length === 0 ? "no submitted asset row matched this CVE" : `${assets.length} submitted asset row${assets.length === 1 ? "" : "s"} matched this CVE`;
  const exposurePhrase = exposureSignals.length === 0 ? "no extra exposure signal was submitted" : `submitted exposure signals: ${exposureSignals.join(", ")}`;
  return `${finding.reason} Buyer evidence: ${assetPhrase}; ${exposurePhrase}.`;
}

interface NvdApiResponse {
  vulnerabilities?: Array<{
    cve: {
      id: string;
      published?: string;
      lastModified?: string;
      descriptions?: Array<{ lang: string; value: string }>;
      metrics?: {
        cvssMetricV31?: Array<{ cvssData: { baseScore?: number; baseSeverity?: string } }>;
        cvssMetricV30?: Array<{ cvssData: { baseScore?: number; baseSeverity?: string } }>;
        cvssMetricV2?: Array<{ cvssData: { baseScore?: number; baseSeverity?: string } }>;
      };
    };
  }>;
}
