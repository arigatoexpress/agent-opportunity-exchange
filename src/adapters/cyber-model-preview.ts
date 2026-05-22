import {
  buildCyberExpertCaseStorePreview,
  type CaseEvidenceRecord,
  type CyberExpertCaseStoreRequest,
} from "./cyber-case-store.js";
import { resolveCyberModelProvider, type CyberModelProviderResolution } from "./cyber-model-provider.js";
import { sha256 } from "../hash.js";

export const CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID = "aoe.cyber_expert_model_preview.v1";

type PriorityTier = "fix_today" | "fix_this_week" | "monitor" | "needs_human_review";

export interface CyberExpertModelPreview {
  schemaId: typeof CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID;
  generatedAt: string;
  mode: "deterministic_model_contract_preview";
  modelRuntime: CyberModelProviderResolution;
  x402Stream: true;
  productId: "cyber_expert_model_preview_pack";
  case: {
    caseId: string;
    caseHash: string;
    title: string;
  };
  executiveSummary: string[];
  priorityQueue: Array<{
    priorityId: string;
    tier: PriorityTier;
    title: string;
    rationale: string;
    citations: string[];
    nextAction: string;
  }>;
  cryptoExploitNotes: Array<{
    incidentEvidenceId: string;
    defensiveTheme: string;
    nextQuestion: string;
    citations: string[];
  }>;
  complianceProofNotes: Array<{
    proofEvidenceId: string;
    decision: string;
    posture: string;
    citations: string[];
  }>;
  humanReviewQueue: string[];
  blockedActions: string[];
  sourceCoverage: Array<{
    sourceId: string;
    evidenceIds: string[];
    ttlSeconds: number;
  }>;
  caseStore: ReturnType<typeof buildCyberExpertCaseStorePreview>;
  safety: {
    readOnly: true;
    sideEffects: "none";
    liveSettlementAllowed: false;
    activeScanningAllowed: false;
    exploitPayloadGenerationAllowed: false;
    modelOutputAuthoritative: false;
    outputPolicy: string[];
  };
  evidenceProof: {
    algorithm: "sha256";
    canonicalization: "stable-json-sorted-keys-v1";
    previewHash: string;
    caseHash: string;
  };
}

export function buildCyberExpertModelPreview(
  request: CyberExpertCaseStoreRequest = {},
  modelRuntime: CyberModelProviderResolution = resolveCyberModelProvider({}),
): CyberExpertModelPreview {
  const caseStore = buildCyberExpertCaseStorePreview(request);
  const priorityQueue = buildPriorityQueue(caseStore.evidenceRecords);
  const cryptoExploitNotes = buildCryptoNotes(caseStore.evidenceRecords);
  const complianceProofNotes = buildComplianceNotes(caseStore.evidenceRecords);
  const previewWithoutProof = {
    schemaId: CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID as typeof CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID,
    generatedAt: new Date().toISOString(),
    mode: "deterministic_model_contract_preview" as const,
    modelRuntime,
    x402Stream: true as const,
    productId: "cyber_expert_model_preview_pack" as const,
    case: {
      caseId: caseStore.case.caseId,
      caseHash: caseStore.case.caseHash,
      title: caseStore.case.title,
    },
    executiveSummary: buildExecutiveSummary(caseStore.evidenceRecords, priorityQueue),
    priorityQueue,
    cryptoExploitNotes,
    complianceProofNotes,
    humanReviewQueue: buildHumanReviewQueue(caseStore.evidenceRecords, priorityQueue, complianceProofNotes),
    blockedActions: [
      "Do not run external scans from this route.",
      "Do not produce exploit payloads or proof-of-concept instructions.",
      "Do not echo raw wallet addresses, hostnames, secrets, private notes, or vendor KYT responses.",
      "Do not make sanctions-clearance, legal-compliance, trading, or money-movement claims.",
      "Do not patch, disclose, send Telegram messages, or post on-chain proofs without human approval.",
    ],
    sourceCoverage: buildSourceCoverage(caseStore.evidenceRecords),
    caseStore,
    safety: {
      readOnly: true as const,
      sideEffects: "none" as const,
      liveSettlementAllowed: false as const,
      activeScanningAllowed: false as const,
      exploitPayloadGenerationAllowed: false as const,
      modelOutputAuthoritative: false as const,
      outputPolicy: [
        "This is a deterministic preview of the future model response shape.",
        "All current facts must come from source-linked evidence records or fresh retrieval.",
        "A future model may summarize and explain; it must not override source truth, privacy gates, or human review gates.",
      ],
    },
  };

  return {
    ...previewWithoutProof,
    evidenceProof: {
      algorithm: "sha256",
      canonicalization: "stable-json-sorted-keys-v1",
      previewHash: sha256(previewWithoutProof),
      caseHash: caseStore.case.caseHash,
    },
  };
}

function buildPriorityQueue(records: CaseEvidenceRecord[]): CyberExpertModelPreview["priorityQueue"] {
  return records
    .filter((record) => record.kind === "vulnerability_signal")
    .map((record) => {
      const affected = numberField(record.normalized.affectedAssetCount);
      const internetFacing = numberField(record.normalized.internetFacingAffectedAssets);
      const criticalityCounts = asCounts(record.normalized.criticalityCounts);
      const score = affected * 20 + internetFacing * 25 + (criticalityCounts.critical ?? 0) * 25 + (criticalityCounts.high ?? 0) * 15;
      const tier: PriorityTier = score >= 50 ? "fix_today" : score >= 20 ? "fix_this_week" : affected > 0 ? "needs_human_review" : "monitor";
      return {
        priorityId: `priority_${record.evidenceId}`,
        tier,
        title: record.title,
        rationale: `${affected} private affected asset(s), ${internetFacing} internet-facing signal(s), criticality counts ${JSON.stringify(criticalityCounts)}. Refresh KEV/EPSS/NVD/OSV before final severity claims.`,
        citations: [record.evidenceId, record.recordHash, ...record.sourceIds],
        nextAction:
          tier === "fix_today"
            ? "Open a human-reviewed remediation ticket and refresh public exploit evidence before the change window."
            : "Refresh public exploit evidence and confirm affectedness before escalating.",
      };
    })
    .sort((left, right) => tierWeight(left.tier) - tierWeight(right.tier));
}

function buildCryptoNotes(records: CaseEvidenceRecord[]): CyberExpertModelPreview["cryptoExploitNotes"] {
  return records
    .filter((record) => record.kind === "crypto_incident_signal")
    .map((record) => {
      const rootCause = String(record.normalized.rootCause ?? "unknown root cause");
      const protocol = String(record.normalized.protocol ?? "unknown protocol");
      return {
        incidentEvidenceId: record.evidenceId,
        defensiveTheme: `${protocol}: map ${rootCause} to control checks, monitoring, and invariant tests.`,
        nextQuestion: "Which buyer controls or protocol components match this incident pattern?",
        citations: [record.evidenceId, record.recordHash, ...record.sourceIds],
      };
    });
}

function buildComplianceNotes(records: CaseEvidenceRecord[]): CyberExpertModelPreview["complianceProofNotes"] {
  return records
    .filter((record) => record.kind === "compliance_proof_signal")
    .map((record) => {
      const decision = String(record.normalized.decision ?? "unknown");
      return {
        proofEvidenceId: record.evidenceId,
        decision,
        posture:
          decision === "pass"
            ? "Proof commitment can support a time-bound allow decision after policy review."
            : "Human review required before relying on this proof commitment.",
        citations: [record.evidenceId, record.recordHash, ...record.sourceIds],
      };
    });
}

function buildExecutiveSummary(records: CaseEvidenceRecord[], priorities: CyberExpertModelPreview["priorityQueue"]): string[] {
  const cveCount = records.filter((record) => record.kind === "vulnerability_signal").length;
  const incidentCount = records.filter((record) => record.kind === "crypto_incident_signal").length;
  const proofCount = records.filter((record) => record.kind === "compliance_proof_signal").length;
  const fixTodayCount = priorities.filter((priority) => priority.tier === "fix_today").length;
  return [
    `Prepared ${records.length} evidence record(s): ${cveCount} vulnerability, ${incidentCount} crypto incident, ${proofCount} compliance proof.`,
    `${fixTodayCount} item(s) currently rank fix_today under deterministic affectedness rules; public exploit sources still need fresh retrieval before final claims.`,
    "The route made no model calls, no paid API calls, no local GPU calls, and no external side effects.",
  ];
}

function buildHumanReviewQueue(
  records: CaseEvidenceRecord[],
  priorities: CyberExpertModelPreview["priorityQueue"],
  compliance: CyberExpertModelPreview["complianceProofNotes"],
): string[] {
  const review: string[] = [];
  if (priorities.some((priority) => priority.tier === "fix_today")) {
    review.push("Review fix_today remediation tickets before buyer delivery or patch execution.");
  }
  if (records.some((record) => record.kind === "operator_note_signal")) {
    review.push("Review private operator notes before exposing them to any model provider.");
  }
  if (compliance.some((note) => note.decision !== "pass")) {
    review.push("Review KYT/sanctions proof commitments before any allow/deny decision or public proof posting.");
  }
  if (review.length === 0) {
    review.push("Refresh public sources and review final report before buyer delivery.");
  }
  return review;
}

function buildSourceCoverage(records: CaseEvidenceRecord[]): CyberExpertModelPreview["sourceCoverage"] {
  const rows = new Map<string, { evidenceIds: string[]; ttlSeconds: number }>();
  for (const record of records) {
    for (const sourceId of record.sourceIds) {
      const row = rows.get(sourceId) ?? { evidenceIds: [], ttlSeconds: record.ttlSeconds };
      row.evidenceIds.push(record.evidenceId);
      row.ttlSeconds = Math.min(row.ttlSeconds, record.ttlSeconds);
      rows.set(sourceId, row);
    }
  }
  return [...rows.entries()]
    .map(([sourceId, row]) => ({ sourceId, evidenceIds: [...new Set(row.evidenceIds)].sort(), ttlSeconds: row.ttlSeconds }))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => typeof entry === "number" && Number.isFinite(entry))
      .map(([key, entry]) => [key, entry as number]),
  );
}

function tierWeight(tier: PriorityTier): number {
  return { fix_today: 0, fix_this_week: 1, needs_human_review: 2, monitor: 3 }[tier];
}
