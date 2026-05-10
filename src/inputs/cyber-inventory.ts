import { extractCvesFromJson } from "./cve-input.js";

export interface CyberAssetEvidence {
  assetId?: string;
  hostname?: string;
  label: string;
  owner?: string;
  businessUnit?: string;
  environment?: string;
  criticality?: "critical" | "high" | "medium" | "low" | "unknown";
  internetFacing?: boolean;
  evidenceFields: string[];
}

export interface CyberInventoryContext {
  buyer?: {
    buyerId?: string;
    name?: string;
    useCase?: string;
  };
  cves: string[];
  assetsByCve: Map<string, CyberAssetEvidence[]>;
  assetRows: number;
}

const ASSET_COLLECTION_KEYS = ["assets", "assetRows", "rows", "inventory", "hosts", "devices"];
const CVE_FIELD_KEYS = ["cve", "cveId", "cveID", "cves", "vulnerabilities", "vulnerabilityIds", "findings"];
const ASSET_ID_KEYS = ["assetId", "asset_id", "id", "deviceId", "device_id"];
const HOSTNAME_KEYS = ["hostname", "host", "name", "assetName", "asset_name", "fqdn"];

export function parseCyberInventory(body: unknown): CyberInventoryContext {
  const assetRows = collectAssetRows(body);
  const assetsByCve = new Map<string, CyberAssetEvidence[]>();

  for (const row of assetRows) {
    const cves = extractCvesFromJson(row);
    if (cves.length === 0) continue;
    const evidence = assetEvidenceFromRow(row);
    for (const cve of cves) {
      const existing = assetsByCve.get(cve) ?? [];
      existing.push(evidence);
      assetsByCve.set(cve, existing);
    }
  }

  const cves = unique([...extractCvesFromJson(body), ...assetsByCve.keys()]);
  return {
    buyer: buyerFromBody(body),
    cves,
    assetsByCve,
    assetRows: assetRows.length,
  };
}

function collectAssetRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    const objectRows = value.filter(isRecord);
    if (objectRows.some(looksLikeAssetRow)) return objectRows;
    return objectRows.flatMap(collectAssetRows);
  }

  if (!isRecord(value)) return [];
  const directRows = Object.entries(value)
    .filter(([key]) => ASSET_COLLECTION_KEYS.includes(key))
    .flatMap(([, child]) => collectAssetRows(child));

  if (looksLikeAssetRow(value)) return [value, ...directRows];
  return directRows;
}

function assetEvidenceFromRow(row: Record<string, unknown>): CyberAssetEvidence {
  const assetId = firstString(row, ASSET_ID_KEYS);
  const hostname = firstString(row, HOSTNAME_KEYS);
  const owner = firstString(row, ["owner", "team", "assignedTo", "assigned_to"]);
  const businessUnit = firstString(row, ["businessUnit", "business_unit", "department"]);
  const environment = firstString(row, ["environment", "env", "stage"]);
  const criticality = normalizeCriticality(firstString(row, ["criticality", "assetCriticality", "asset_criticality", "priority"]));
  const internetFacing = normalizeBoolean(firstValue(row, ["internetFacing", "internet_facing", "public", "exposed", "external"]));
  const evidenceFields = Object.keys(row)
    .filter((key) => [...CVE_FIELD_KEYS, ...ASSET_ID_KEYS, ...HOSTNAME_KEYS].includes(key) || /critical|internet|public|owner|team|environment|business/i.test(key))
    .sort();

  return {
    assetId,
    hostname,
    label: hostname ?? assetId ?? firstString(row, ["ip", "ipAddress", "ip_address"]) ?? "unnamed_asset",
    owner,
    businessUnit,
    environment,
    criticality,
    internetFacing,
    evidenceFields,
  };
}

function buyerFromBody(body: unknown): CyberInventoryContext["buyer"] {
  if (!isRecord(body)) return undefined;
  const buyer = isRecord(body.buyer) ? body.buyer : body;
  const buyerId = firstString(buyer, ["buyerId", "buyer_id", "customerId", "customer_id", "tenantId", "tenant_id"]);
  const name = firstString(buyer, ["buyerName", "buyer_name", "customerName", "customer_name", "name", "organization"]);
  const useCase = firstString(buyer, ["useCase", "use_case", "purpose"]);
  if (!buyerId && !name && !useCase) return undefined;
  return { buyerId, name, useCase };
}

function looksLikeAssetRow(row: Record<string, unknown>): boolean {
  return (
    CVE_FIELD_KEYS.some((key) => key in row) &&
    (ASSET_ID_KEYS.some((key) => key in row) ||
      HOSTNAME_KEYS.some((key) => key in row) ||
      ["owner", "team", "criticality", "assetCriticality", "internetFacing", "environment"].some((key) => key in row))
  );
}

function firstString(row: Record<string, unknown>, keys: string[]): string | undefined {
  const value = firstValue(row, keys);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function firstValue(row: Record<string, unknown>, keys: string[]): unknown {
  return keys.map((key) => row[key]).find((value) => value !== undefined && value !== null);
}

function normalizeCriticality(value?: string): CyberAssetEvidence["criticality"] {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "critical" || normalized === "high" || normalized === "medium" || normalized === "low") return normalized;
  return value ? "unknown" : undefined;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  if (/^(true|yes|y|1|public|external)$/i.test(value.trim())) return true;
  if (/^(false|no|n|0|private|internal)$/i.test(value.trim())) return false;
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.toUpperCase()))].sort();
}
