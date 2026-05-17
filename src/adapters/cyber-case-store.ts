import { parseCyberInventory, type CyberInventoryContext } from "../inputs/cyber-inventory.js";
import { sha256, shortHash } from "../hash.js";
import { sources } from "../catalog.js";

export const CYBER_EXPERT_CASE_STORE_SCHEMA_ID = "aoe.cyber_expert_case_store.preview.v1";

type EvidenceKind = "vulnerability_signal" | "crypto_incident_signal" | "compliance_proof_signal" | "operator_note_signal";
type EvidenceVisibility = "private_case" | "public_reference" | "proof_commitment";

export interface CryptoIncidentInput {
  incidentId?: string;
  protocol?: string;
  chain?: string;
  occurredAt?: string;
  lossUsd?: number;
  rootCause?: string;
  controlsFailed?: string[];
  publicSummary?: string;
  sourceUrls?: string[];
}

export interface ComplianceProofInput {
  subjectCommitment?: string;
  decision?: "pass" | "deny" | "review" | "expired" | "unknown";
  policyVersion?: string;
  sourceMerkleRoot?: string;
  issuedAt?: string;
  expiresAt?: string;
  sourceIds?: string[];
}

export interface CyberExpertCaseStoreRequest {
  caseTitle?: string;
  inventory?: unknown;
  cves?: string[];
  cryptoIncidents?: CryptoIncidentInput[];
  complianceProofs?: ComplianceProofInput[];
  notes?: string[];
}

export interface CaseEvidenceRecord {
  evidenceId: string;
  kind: EvidenceKind;
  title: string;
  visibility: EvidenceVisibility;
  sourceIds: string[];
  sourceEvidence: Array<{
    sourceId: string;
    owner: string;
    url: string;
    rightsLicenseId: string;
    rightsRisk: string;
    retrievalMode: string;
    retrievedAt: "not_retrieved_in_preview";
    ttlSeconds: number;
    outputPolicy: string[];
  }>;
  retrievalMode: string;
  ttlSeconds: number;
  summary: string;
  normalized: Record<string, unknown>;
  caveats: string[];
  outputPolicy: string[];
  recordHash: string;
}

export interface RagDocument {
  docId: string;
  title: string;
  visibility: EvidenceVisibility;
  sourceIds: string[];
  ttlSeconds: number;
  body: string;
  metadata: Record<string, unknown>;
  recordHash: string;
}

export interface CyberExpertCaseStorePreview {
  schemaId: typeof CYBER_EXPERT_CASE_STORE_SCHEMA_ID;
  generatedAt: string;
  mode: "read_only_case_store_preview";
  x402Stream: true;
  productId: "cyber_expert_case_store_pack";
  case: {
    caseId: string;
    title: string;
    caseHash: string;
    privacyClass: "private_case_metadata";
    authorizedInventoryRequired: true;
  };
  inputSummary: {
    cveCount: number;
    assetRows: number;
    cryptoIncidentCount: number;
    complianceProofCount: number;
    noteCount: number;
    privateSignalsSuppressed: number;
  };
  evidenceRecords: CaseEvidenceRecord[];
  ragDocuments: RagDocument[];
  retrievalPlan: Array<{
    sourceId: string;
    purpose: string;
    retrievalMode: string;
    freshnessTtlSeconds: number;
    privateDataPolicy: string;
  }>;
  modelPreviewContract: {
    allowedUses: string[];
    blockedUses: string[];
    requiredInputsForModel: string[];
    responseRequirements: string[];
  };
  safety: {
    readOnly: true;
    sideEffects: "none";
    liveSettlementAllowed: false;
    activeScanningAllowed: false;
    exploitPayloadGenerationAllowed: false;
    rawWalletAddressEchoAllowed: false;
    privateHostnamesEchoAllowed: false;
    outputPolicy: string[];
  };
  evidenceProof: {
    algorithm: "sha256";
    canonicalization: "stable-json-sorted-keys-v1";
    caseHash: string;
    evidenceRecordHashes: string[];
    ragDocumentHashes: string[];
  };
}

const CVE_PATTERN = /^CVE-\d{4}-\d{4,}$/i;
const RAW_WALLET_PATTERN = /\b0x[a-fA-F0-9]{40}\b/;
const SECRET_PATTERN = /\b(api[_-]?key|private[_-]?key|secret|token|password)\b/i;

export function buildCyberExpertCaseStorePreview(request: CyberExpertCaseStoreRequest = {}): CyberExpertCaseStorePreview {
  const inventory = parseInventory(request);
  const explicitCves = normalizeCves(request.cves ?? []);
  const allCves = [...new Set([...inventory.cves, ...explicitCves])].sort();
  const cryptoIncidents = sanitizeCryptoIncidents(request.cryptoIncidents ?? []);
  const complianceProofs = sanitizeComplianceProofs(request.complianceProofs ?? []);
  const noteCount = request.notes?.length ?? 0;
  const privateSignalsSuppressed = countPrivateSignals(request, inventory);

  const evidenceRecords = [
    ...buildVulnerabilityEvidence(allCves, inventory),
    ...cryptoIncidents.map(buildCryptoIncidentEvidence),
    ...complianceProofs.map(buildComplianceProofEvidence),
    ...buildOperatorNoteEvidence(request.notes ?? []),
  ];
  const ragDocuments = evidenceRecords.map(evidenceToRagDocument);
  const sanitizedCase = {
    title: sanitizeTitle(request.caseTitle),
    cves: allCves,
    assetRows: inventory.assetRows,
    cryptoIncidents,
    complianceProofs,
    noteCount,
    evidenceHashes: evidenceRecords.map((record) => record.recordHash),
  };
  const caseHash = sha256(sanitizedCase);

  return {
    schemaId: CYBER_EXPERT_CASE_STORE_SCHEMA_ID,
    generatedAt: new Date().toISOString(),
    mode: "read_only_case_store_preview",
    x402Stream: true,
    productId: "cyber_expert_case_store_pack",
    case: {
      caseId: `case_${shortHash(sanitizedCase, 18)}`,
      title: sanitizedCase.title,
      caseHash,
      privacyClass: "private_case_metadata",
      authorizedInventoryRequired: true,
    },
    inputSummary: {
      cveCount: allCves.length,
      assetRows: inventory.assetRows,
      cryptoIncidentCount: cryptoIncidents.length,
      complianceProofCount: complianceProofs.length,
      noteCount,
      privateSignalsSuppressed,
    },
    evidenceRecords,
    ragDocuments,
    retrievalPlan: buildRetrievalPlan(Boolean(allCves.length), Boolean(cryptoIncidents.length), Boolean(complianceProofs.length)),
    modelPreviewContract: {
      allowedUses: [
        "summarize normalized evidence",
        "rank defensive remediation priorities",
        "explain source freshness and caveats",
        "draft buyer-safe tickets and reports",
        "refuse offensive or unauthorized requests",
      ],
      blockedUses: [
        "active scanning",
        "exploit payload generation",
        "credential or secret handling",
        "wallet signing or money movement",
        "sanctions evasion or permanent legal-clearance claims",
      ],
      requiredInputsForModel: [
        "caseHash",
        "evidenceRecords",
        "ragDocuments",
        "retrievalPlan",
        "source-rights envelopes",
        "output policy",
      ],
      responseRequirements: [
        "cite evidenceIds and sourceIds",
        "separate global severity from buyer affectedness",
        "label stale or missing sources",
        "avoid hostnames, raw wallet addresses, secrets, and exploit instructions",
      ],
    },
    safety: {
      readOnly: true,
      sideEffects: "none",
      liveSettlementAllowed: false,
      activeScanningAllowed: false,
      exploitPayloadGenerationAllowed: false,
      rawWalletAddressEchoAllowed: false,
      privateHostnamesEchoAllowed: false,
      outputPolicy: [
        "Defensive case preparation only.",
        "Do not echo hostnames, raw wallet addresses, secrets, private notes, or vendor payloads.",
        "Use source-linked retrieval for current facts; this preview does not fetch live external sources.",
        "No exploit payloads, unauthorized scans, wallet signing, trading, or sanctions evasion.",
      ],
    },
    evidenceProof: {
      algorithm: "sha256",
      canonicalization: "stable-json-sorted-keys-v1",
      caseHash,
      evidenceRecordHashes: evidenceRecords.map((record) => record.recordHash),
      ragDocumentHashes: ragDocuments.map((document) => document.recordHash),
    },
  };
}

function parseInventory(request: CyberExpertCaseStoreRequest): CyberInventoryContext {
  if (request.inventory !== undefined) return parseCyberInventory(request.inventory);
  return parseCyberInventory({ cves: request.cves ?? [] });
}

function normalizeCves(cves: string[]): string[] {
  return [...new Set(cves.filter((cve) => CVE_PATTERN.test(cve)).map((cve) => cve.toUpperCase()))].sort();
}

function sanitizeTitle(value?: string): string {
  const title = value?.trim().replace(/\s+/g, " ");
  if (!title) return "Cyber expert case";
  return truncate(stripPrivatePatterns(title), 120);
}

function sanitizeCryptoIncidents(incidents: CryptoIncidentInput[]): CryptoIncidentInput[] {
  return incidents.slice(0, 50).map((incident, index) => ({
    incidentId: truncate(stripPrivatePatterns(incident.incidentId ?? `incident_${index + 1}`), 80),
    protocol: truncate(stripPrivatePatterns(incident.protocol ?? "unknown_protocol"), 80),
    chain: truncate(stripPrivatePatterns(incident.chain ?? "unknown_chain"), 80),
    occurredAt: truncate(stripPrivatePatterns(incident.occurredAt ?? "unknown"), 40),
    lossUsd: typeof incident.lossUsd === "number" && Number.isFinite(incident.lossUsd) && incident.lossUsd >= 0 ? incident.lossUsd : undefined,
    rootCause: truncate(stripPrivatePatterns(incident.rootCause ?? "unknown_root_cause"), 120),
    controlsFailed: (incident.controlsFailed ?? []).slice(0, 10).map((control) => truncate(stripPrivatePatterns(control), 80)),
    publicSummary: truncate(stripPrivatePatterns(incident.publicSummary ?? ""), 240),
    sourceUrls: (incident.sourceUrls ?? []).filter((url) => /^https:\/\//i.test(url)).slice(0, 10),
  }));
}

function sanitizeComplianceProofs(proofs: ComplianceProofInput[]): ComplianceProofInput[] {
  return proofs.slice(0, 50).map((proof, index) => ({
    subjectCommitment: normalizeCommitment(proof.subjectCommitment, `missing_commitment_${index + 1}`),
    decision: proof.decision ?? "unknown",
    policyVersion: truncate(stripPrivatePatterns(proof.policyVersion ?? "unknown_policy"), 80),
    sourceMerkleRoot: normalizeCommitment(proof.sourceMerkleRoot, "missing_source_root"),
    issuedAt: truncate(stripPrivatePatterns(proof.issuedAt ?? "unknown"), 40),
    expiresAt: truncate(stripPrivatePatterns(proof.expiresAt ?? "unknown"), 40),
    sourceIds: normalizeSourceIds(proof.sourceIds ?? ["ofac_sanctions_lists", "trm_sanctions_docs"]),
  }));
}

function normalizeCommitment(value: string | undefined, fallback: string): string {
  const stripped = stripPrivatePatterns(value ?? fallback).trim();
  if (/^(sha256|hmac|commitment|merkle):[a-zA-Z0-9:_-]+$/.test(stripped)) return stripped;
  if (/^[a-fA-F0-9]{32,128}$/.test(stripped)) return `sha256:${stripped.toLowerCase()}`;
  return `commitment:${shortHash(stripped, 20)}`;
}

function normalizeSourceIds(sourceIds: string[]): string[] {
  const allowed = new Set(["ofac_sanctions_lists", "trm_sanctions_docs", "buyer_authorized_inventory"]);
  return [...new Set(sourceIds.filter((sourceId) => allowed.has(sourceId)))].sort();
}

function buildVulnerabilityEvidence(cves: string[], inventory: CyberInventoryContext): CaseEvidenceRecord[] {
  if (cves.length === 0) return [];
  return cves.map((cve) => {
    const assets = inventory.assetsByCve.get(cve) ?? [];
    const normalized = {
      cve,
      affectedAssetCount: assets.length,
      assetRows: inventory.assetRows,
      criticalityCounts: countCriticality(assets),
      internetFacingAffectedAssets: assets.filter((asset) => asset.internetFacing).length,
      publicFactSourcesPlanned: ["cisa_kev", "first_epss", "nvd_cve", "osv"],
      buyerInventoryHash: sha256({ cve, assetCount: assets.length, assetRows: inventory.assetRows, criticalityCounts: countCriticality(assets) }),
    };
    const record = withoutRecordHash({
      evidenceId: `vuln_${cve.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      kind: "vulnerability_signal" as const,
      title: `${cve} private affectedness seed`,
      visibility: "private_case" as const,
      sourceIds: ["buyer_authorized_inventory", "cisa_kev", "first_epss", "nvd_cve", "osv"],
      retrievalMode: "buyer_inventory_plus_planned_public_rag",
      ttlSeconds: 86_400,
      summary: `${cve} has ${assets.length} affected private inventory matches; live KEV/EPSS/NVD/OSV facts must be retrieved before final ranking.`,
      normalized,
      caveats: [
        "This record does not prove exploitability.",
        "Buyer affectedness is private and summarized as counts only.",
        "Public vulnerability facts must be refreshed before buyer-facing claims.",
      ],
      outputPolicy: ["Defensive prioritization only.", "No exploit payloads or credential material.", "Do not echo private hostnames."],
    });
    return { ...record, recordHash: sha256(record) };
  });
}

function buildCryptoIncidentEvidence(incident: CryptoIncidentInput): CaseEvidenceRecord {
  const normalized = {
    incidentId: incident.incidentId,
    protocol: incident.protocol,
    chain: incident.chain,
    occurredAt: incident.occurredAt,
    lossUsd: incident.lossUsd ?? null,
    rootCause: incident.rootCause,
    controlsFailed: incident.controlsFailed ?? [],
    sourceUrls: incident.sourceUrls ?? [],
  };
  const record = withoutRecordHash({
    evidenceId: `crypto_incident_${shortHash(normalized, 14)}`,
    kind: "crypto_incident_signal" as const,
    title: `${incident.protocol ?? "Unknown protocol"} incident pattern`,
    visibility: "public_reference" as const,
    sourceIds: ["crypto_incident_public_metadata", "defillama"],
    retrievalMode: "public_incident_metadata_plus_source_links",
    ttlSeconds: 86_400,
    summary: buildCryptoSummary(incident),
    normalized,
    caveats: [
      "Incident facts are public metadata or user-supplied summaries until live source retrieval is added.",
      "Loss estimates and root-cause labels can revise after postmortems.",
    ],
    outputPolicy: ["Defensive control mapping only.", "No exploit walkthroughs.", "No wallet tracing claims without source-backed evidence."],
  });
  return { ...record, recordHash: sha256(record) };
}

function buildComplianceProofEvidence(proof: ComplianceProofInput): CaseEvidenceRecord {
  const normalized = {
    subjectCommitment: proof.subjectCommitment,
    decision: proof.decision,
    policyVersion: proof.policyVersion,
    sourceMerkleRoot: proof.sourceMerkleRoot,
    issuedAt: proof.issuedAt,
    expiresAt: proof.expiresAt,
    sourceIds: proof.sourceIds,
  };
  const record = withoutRecordHash({
    evidenceId: `compliance_proof_${shortHash(normalized, 14)}`,
    kind: "compliance_proof_signal" as const,
    title: "Minimum-disclosure compliance proof seed",
    visibility: "proof_commitment" as const,
    sourceIds: proof.sourceIds?.length ? proof.sourceIds : ["ofac_sanctions_lists", "trm_sanctions_docs"],
    retrievalMode: "private_screening_commitment_only",
    ttlSeconds: 86_400,
    summary: `Compliance proof commitment is ${proof.decision ?? "unknown"} under ${proof.policyVersion ?? "unknown_policy"}; raw subject and vendor responses are not present.`,
    normalized,
    caveats: [
      "A proof commitment is not a permanent legal clearance.",
      "Raw wallet addresses and vendor KYT responses must stay private.",
      "Screening freshness and expiry are part of the decision.",
    ],
    outputPolicy: ["Publish commitments only.", "Do not echo raw wallet addresses.", "No sanctions evasion assistance."],
  });
  return { ...record, recordHash: sha256(record) };
}

function buildOperatorNoteEvidence(notes: string[]): CaseEvidenceRecord[] {
  if (notes.length === 0) return [];
  const normalized = {
    noteCount: notes.length,
    noteHashes: notes.slice(0, 20).map((note) => sha256(stripPrivatePatterns(note))),
    suppressedContent: true,
  };
  const record = withoutRecordHash({
    evidenceId: `operator_notes_${shortHash(normalized, 14)}`,
    kind: "operator_note_signal" as const,
    title: "Operator private note hash bundle",
    visibility: "private_case" as const,
    sourceIds: ["buyer_authorized_inventory"],
    retrievalMode: "private_note_hashes_only",
    ttlSeconds: 86_400,
    summary: `${notes.length} operator notes were hashed for continuity; note bodies are not echoed in this preview.`,
    normalized,
    caveats: ["Operator notes may contain sensitive context and are not model-visible until reviewed."],
    outputPolicy: ["Do not echo private notes.", "Use note hashes for continuity only."],
  });
  return [{ ...record, recordHash: sha256(record) }];
}

function evidenceToRagDocument(record: CaseEvidenceRecord): RagDocument {
  const document = {
    docId: `rag_${record.evidenceId}`,
    title: record.title,
    visibility: record.visibility,
    sourceIds: record.sourceIds,
    ttlSeconds: record.ttlSeconds,
    body: [
      `Evidence ${record.evidenceId}: ${record.summary}`,
      `Kind: ${record.kind}. Visibility: ${record.visibility}.`,
      `Sources: ${record.sourceIds.join(", ")}.`,
      `Caveats: ${record.caveats.join(" ")}`,
      `Output policy: ${record.outputPolicy.join(" ")}`,
    ].join("\n"),
    metadata: {
      evidenceId: record.evidenceId,
      kind: record.kind,
      retrievalMode: record.retrievalMode,
      recordHash: record.recordHash,
    },
  };
  return { ...document, recordHash: sha256(document) };
}

function buildRetrievalPlan(hasCves: boolean, hasCrypto: boolean, hasCompliance: boolean) {
  return [
    ...(hasCves
      ? [
          {
            sourceId: "cisa_kev",
            purpose: "Known exploited vulnerability signal.",
            retrievalMode: "official_download",
            freshnessTtlSeconds: 86_400,
            privateDataPolicy: "Query by CVE only; do not send buyer hostnames.",
          },
          {
            sourceId: "first_epss",
            purpose: "Exploit probability scoring.",
            retrievalMode: "official_api",
            freshnessTtlSeconds: 86_400,
            privateDataPolicy: "Query by CVE only; do not send buyer hostnames.",
          },
          {
            sourceId: "nvd_cve",
            purpose: "CVE severity and product context.",
            retrievalMode: "official_api",
            freshnessTtlSeconds: 86_400,
            privateDataPolicy: "Query by CVE only; do not send buyer hostnames.",
          },
          {
            sourceId: "osv",
            purpose: "Package vulnerability and fixed-version context.",
            retrievalMode: "official_api",
            freshnessTtlSeconds: 86_400,
            privateDataPolicy: "Query by package or CVE only after source-rights review.",
          },
        ]
      : []),
    ...(hasCrypto
      ? [
          {
            sourceId: "crypto_incident_public_metadata",
            purpose: "Public exploit incident metadata and postmortem links.",
            retrievalMode: "public_docs",
            freshnessTtlSeconds: 86_400,
            privateDataPolicy: "Use public incident ids and source URLs; avoid private wallet/address claims.",
          },
          {
            sourceId: "defillama",
            purpose: "Public DeFi incident and protocol context where terms allow derived analysis.",
            retrievalMode: "open_data",
            freshnessTtlSeconds: 86_400,
            privateDataPolicy: "Use aggregate incident metadata only.",
          },
        ]
      : []),
    ...(hasCompliance
      ? [
          {
            sourceId: "ofac_sanctions_lists",
            purpose: "Official public sanctions source anchor.",
            retrievalMode: "official_download",
            freshnessTtlSeconds: 86_400,
            privateDataPolicy: "Use commitments and source roots in public outputs.",
          },
          {
            sourceId: "trm_sanctions_docs",
            purpose: "Private KYT adapter contract and terms boundary.",
            retrievalMode: "partner_api",
            freshnessTtlSeconds: 86_400,
            privateDataPolicy: "Never expose raw TRM/KYT responses or raw wallet addresses.",
          },
        ]
      : []),
  ];
}

function countCriticality(assets: CyberInventoryContext["assetsByCve"] extends Map<string, infer Assets> ? Assets : never) {
  return assets.reduce<Record<string, number>>((acc, asset) => {
    const key = asset.criticality ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function countPrivateSignals(request: CyberExpertCaseStoreRequest, inventory: CyberInventoryContext): number {
  const serialized = JSON.stringify(request);
  const walletSignals = (serialized.match(RAW_WALLET_PATTERN) ?? []).length;
  const secretSignals = (serialized.match(SECRET_PATTERN) ?? []).length;
  const hostSignals = [...inventory.assetsByCve.values()].reduce((total, assets) => total + assets.filter((asset) => asset.hostname).length, 0);
  return walletSignals + secretSignals + hostSignals + (request.notes?.length ?? 0);
}

function buildCryptoSummary(incident: CryptoIncidentInput): string {
  const parts = [
    `${incident.protocol ?? "Unknown protocol"} on ${incident.chain ?? "unknown chain"}`,
    `root cause: ${incident.rootCause ?? "unknown"}`,
    incident.lossUsd !== undefined ? `reported loss USD: ${incident.lossUsd}` : "reported loss unknown",
  ];
  return `${parts.join("; ")}.`;
}

function stripPrivatePatterns(value: string): string {
  return value.replace(RAW_WALLET_PATTERN, "[redacted_wallet]").replace(SECRET_PATTERN, "[redacted_secret]");
}

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, Math.max(0, length - 3))}...` : value;
}

function withoutRecordHash(record: Omit<CaseEvidenceRecord, "recordHash" | "sourceEvidence">): Omit<CaseEvidenceRecord, "recordHash"> {
  return {
    ...record,
    sourceEvidence: buildSourceEvidence(record.sourceIds, record.retrievalMode, record.ttlSeconds, record.outputPolicy),
  };
}

function buildSourceEvidence(sourceIds: string[], retrievalMode: string, ttlSeconds: number, outputPolicy: string[]): CaseEvidenceRecord["sourceEvidence"] {
  const lookup = new Map(sources.map((source) => [source.sourceId, source]));
  return sourceIds.map((sourceId) => {
    const source = lookup.get(sourceId);
    return {
      sourceId,
      owner: source?.owner ?? "unknown",
      url: source?.url ?? "unknown",
      rightsLicenseId: source?.rights.licenseId ?? "unknown",
      rightsRisk: source?.risk ?? "yellow",
      retrievalMode,
      retrievedAt: "not_retrieved_in_preview",
      ttlSeconds,
      outputPolicy,
    };
  });
}
