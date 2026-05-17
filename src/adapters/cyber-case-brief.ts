import {
  buildCyberExpertModelPreview,
  type CyberExpertModelPreview,
} from "./cyber-model-preview.js";
import { buildCyberOllamaModelPreview, type CyberOllamaModelPreview } from "./cyber-ollama-model.js";
import { fetchCyberPublicCveRefresh, type CyberPublicCveRefreshReport } from "./cyber-public-cve.js";
import type { CaseEvidenceRecord, CyberExpertCaseStoreRequest } from "./cyber-case-store.js";
import { sha256 } from "../hash.js";

export const CYBER_EXPERT_CASE_BRIEF_SCHEMA_ID = "aoe.cyber_expert_case_brief.v1";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface CyberExpertCaseBriefOptions {
  includePublicCveRefresh?: boolean;
  includeLocalModel?: boolean;
  env?: NodeJS.ProcessEnv;
  fetcher?: FetchLike;
  currentEvalSuiteHash?: string;
}

export interface CyberExpertCaseBrief {
  schemaId: typeof CYBER_EXPERT_CASE_BRIEF_SCHEMA_ID;
  generatedAt: string;
  mode: "defensive_case_brief";
  x402Stream: true;
  productId: "cyber_expert_model_preview_pack";
  case: CyberExpertModelPreview["case"];
  deterministicPreview: CyberExpertModelPreview;
  publicCveRefresh: CyberPublicCveRefreshReport | null;
  localModelPreview: CyberOllamaModelPreview | null;
  operatorDecision: {
    posture: "ready_for_human_review" | "needs_more_source_refresh" | "needs_authorized_inventory" | "blocked_sensitive_output";
    fixTodayCount: number;
    knownExploitedCount: number;
    highEpssCount: number;
    humanReviewRequired: boolean;
    recommendedActions: string[];
    blockedActions: string[];
  };
  safety: {
    readOnly: true;
    sideEffects: "deterministic_analysis_plus_optional_public_fetch_and_optional_local_inference";
    privateDataSentToPublicSources: false;
    localModelOptional: true;
    modelOutputAuthoritative: false;
    activeScanningAllowed: false;
    exploitPayloadGenerationAllowed: false;
    liveSettlementAllowed: false;
    outputPolicy: string[];
  };
  evidenceProof: {
    algorithm: "sha256";
    canonicalization: "stable-json-sorted-keys-v1";
    briefHash: string;
    deterministicPreviewHash: string;
    publicCveRefreshHash: string | null;
    localModelPreviewHash: string | null;
  };
}

export async function buildCyberExpertCaseBrief(
  request: CyberExpertCaseStoreRequest = {},
  options: CyberExpertCaseBriefOptions = {},
): Promise<CyberExpertCaseBrief> {
  const deterministicPreview = buildCyberExpertModelPreview(request);
  const cves = extractCves(deterministicPreview.caseStore.evidenceRecords);
  const includePublicCveRefresh = options.includePublicCveRefresh ?? true;
  const includeLocalModel = options.includeLocalModel ?? false;
  const fetcher = options.fetcher ?? fetch;
  const publicCveRefresh =
    includePublicCveRefresh && cves.length > 0 ? await fetchCyberPublicCveRefresh(cves, fetcher) : null;
  const localModelPreview = includeLocalModel
    ? await buildCyberOllamaModelPreview(request, options.env ?? process.env, fetcher, options.currentEvalSuiteHash)
    : null;

  const withoutProof = {
    schemaId: CYBER_EXPERT_CASE_BRIEF_SCHEMA_ID as typeof CYBER_EXPERT_CASE_BRIEF_SCHEMA_ID,
    generatedAt: new Date().toISOString(),
    mode: "defensive_case_brief" as const,
    x402Stream: true as const,
    productId: "cyber_expert_model_preview_pack" as const,
    case: deterministicPreview.case,
    deterministicPreview,
    publicCveRefresh,
    localModelPreview,
    operatorDecision: buildOperatorDecision(deterministicPreview, publicCveRefresh, localModelPreview),
    safety: {
      readOnly: true as const,
      sideEffects: "deterministic_analysis_plus_optional_public_fetch_and_optional_local_inference" as const,
      privateDataSentToPublicSources: false as const,
      localModelOptional: true as const,
      modelOutputAuthoritative: false as const,
      activeScanningAllowed: false as const,
      exploitPayloadGenerationAllowed: false as const,
      liveSettlementAllowed: false as const,
      outputPolicy: [
        "This is the preferred operator brief that composes deterministic evidence, optional public CVE freshness, and optional local model advice.",
        "Public source refresh receives CVE identifiers only; buyer inventory, hostnames, notes, wallets, secrets, and customer identifiers stay private.",
        "Local model output is advisory and non-authoritative; deterministic evidence and source freshness drive operator decisions.",
        "No active scanning, exploit payload generation, proof posting, Telegram sends, wallet signing, trading, or money movement.",
      ],
    },
  };

  return {
    ...withoutProof,
    evidenceProof: {
      algorithm: "sha256",
      canonicalization: "stable-json-sorted-keys-v1",
      briefHash: sha256(withoutProof),
      deterministicPreviewHash: deterministicPreview.evidenceProof.previewHash,
      publicCveRefreshHash: publicCveRefresh?.evidenceProof.reportHash ?? null,
      localModelPreviewHash: localModelPreview?.evidenceProof.previewHash ?? null,
    },
  };
}

function buildOperatorDecision(
  preview: CyberExpertModelPreview,
  publicCveRefresh: CyberPublicCveRefreshReport | null,
  localModelPreview: CyberOllamaModelPreview | null,
): CyberExpertCaseBrief["operatorDecision"] {
  const fixTodayCount = preview.priorityQueue.filter((priority) => priority.tier === "fix_today").length;
  const knownExploitedCount = publicCveRefresh?.records.filter((record) => record.kev.knownExploited).length ?? 0;
  const highEpssCount = publicCveRefresh?.records.filter((record) => (record.epss.score ?? 0) >= 0.7).length ?? 0;
  const hasAffectedInventory = preview.caseStore.evidenceRecords.some(
    (record) => record.kind === "vulnerability_signal" && numberField(record.normalized.affectedAssetCount) > 0,
  );
  const blockedSensitiveOutput = localModelPreview?.localModel.status === "degraded_sensitive_model_output";
  const publicRefreshMissing = preview.caseStore.inputSummary.cveCount > 0 && !publicCveRefresh;
  const degradedSources = publicCveRefresh?.sourceResults.some((source) => source.status === "degraded") ?? false;
  const posture: CyberExpertCaseBrief["operatorDecision"]["posture"] = blockedSensitiveOutput
    ? "blocked_sensitive_output"
    : !hasAffectedInventory && preview.caseStore.inputSummary.cveCount > 0
      ? "needs_authorized_inventory"
      : publicRefreshMissing || degradedSources
        ? "needs_more_source_refresh"
        : "ready_for_human_review";

  return {
    posture,
    fixTodayCount,
    knownExploitedCount,
    highEpssCount,
    humanReviewRequired: true,
    recommendedActions: [
      ...(fixTodayCount > 0 ? ["Open human-reviewed remediation tickets for fix_today items."] : []),
      ...(knownExploitedCount > 0 ? ["Treat KEV matches as urgent public exploitation signals, then confirm buyer affectedness."] : []),
      ...(highEpssCount > 0 ? ["Use high EPSS scores as prioritization evidence, not proof of buyer exploitability."] : []),
      ...(!hasAffectedInventory && preview.caseStore.inputSummary.cveCount > 0 ? ["Attach authorized inventory before making buyer-specific remediation claims."] : []),
      ...(degradedSources ? ["Refresh degraded public sources before final delivery."] : []),
      ...(localModelPreview?.localModel.status === "completed" ? ["Use local model notes only as advisory wording after human review."] : []),
      "Refresh NVD, OSV, and vendor advisories before final remediation language.",
    ],
    blockedActions: preview.blockedActions,
  };
}

function extractCves(records: CaseEvidenceRecord[]): string[] {
  return records
    .filter((record) => record.kind === "vulnerability_signal")
    .map((record) => String(record.normalized.cve ?? ""))
    .filter((cve) => /^CVE-\d{4}-\d{4,}$/i.test(cve))
    .map((cve) => cve.toUpperCase())
    .sort();
}

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
