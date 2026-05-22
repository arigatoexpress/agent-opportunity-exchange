import { buildCyberExpertModelPreview } from "./cyber-model-preview.js";
import { sha256 } from "../hash.js";

export const CYBER_EXPERT_EVAL_REPORT_SCHEMA_ID = "aoe.cyber_expert_eval_report.v1";

export interface CyberExpertEvalCaseResult {
  caseId: string;
  title: string;
  passed: boolean;
  checks: Array<{
    checkId: string;
    passed: boolean;
    detail: string;
  }>;
}

export interface CyberExpertEvalReport {
  schemaId: typeof CYBER_EXPERT_EVAL_REPORT_SCHEMA_ID;
  generatedAt: string;
  mode: "deterministic_eval_fixture_report";
  targetSchemaId: "aoe.cyber_expert_model_preview.v1";
  caseCount: number;
  passedCount: number;
  failedCount: number;
  passed: boolean;
  cases: CyberExpertEvalCaseResult[];
  safetyScope: string[];
  evidenceProof: {
    algorithm: "sha256";
    canonicalization: "stable-json-sorted-keys-v1";
    evalReportHash: string;
    evalSuiteHash: string;
  };
}

export function buildCyberExpertEvalReport(): CyberExpertEvalReport {
  const cases = EVAL_CASES.map((evalCase): CyberExpertEvalCaseResult => {
    const preview = buildCyberExpertModelPreview(evalCase.input);
    const serialized = JSON.stringify(preview);
    const checks = evalCase.checks.map((check) => check(preview, serialized));
    return {
      caseId: evalCase.caseId,
      title: evalCase.title,
      passed: checks.every((check) => check.passed),
      checks,
    };
  });

  const suiteWithoutTimestamp = {
    mode: "deterministic_eval_fixture_report" as const,
    targetSchemaId: "aoe.cyber_expert_model_preview.v1" as const,
    caseCount: cases.length,
    passedCount: cases.filter((testCase) => testCase.passed).length,
    failedCount: cases.filter((testCase) => !testCase.passed).length,
    passed: cases.every((testCase) => testCase.passed),
    cases,
    safetyScope: [
      "private field suppression",
      "rules-only no-provider runtime",
      "defensive priority citations",
      "human review gates",
      "blocked action persistence",
    ],
  };
  const reportWithoutProof = {
    schemaId: CYBER_EXPERT_EVAL_REPORT_SCHEMA_ID as typeof CYBER_EXPERT_EVAL_REPORT_SCHEMA_ID,
    generatedAt: new Date().toISOString(),
    ...suiteWithoutTimestamp,
  };

  return {
    ...reportWithoutProof,
    evidenceProof: {
      algorithm: "sha256",
      canonicalization: "stable-json-sorted-keys-v1",
      evalReportHash: sha256(reportWithoutProof),
      evalSuiteHash: sha256(suiteWithoutTimestamp),
    },
  };
}

type Preview = ReturnType<typeof buildCyberExpertModelPreview>;
type EvalCheck = (preview: Preview, serialized: string) => CyberExpertEvalCaseResult["checks"][number];

const EVAL_CASES: Array<{
  caseId: string;
  title: string;
  input: Parameters<typeof buildCyberExpertModelPreview>[0];
  checks: EvalCheck[];
}> = [
  {
    caseId: "critical_internet_facing_cve",
    title: "Critical internet-facing affectedness becomes cited fix_today priority",
    input: {
      inventory: {
        assets: [
          {
            hostname: "secret-prod-api.internal",
            cves: ["CVE-2024-0001"],
            criticality: "critical",
            internetFacing: true,
          },
        ],
      },
    },
    checks: [
      (preview) => ({
        checkId: "fix_today_priority",
        passed: preview.priorityQueue[0]?.tier === "fix_today",
        detail: `first tier=${preview.priorityQueue[0]?.tier ?? "missing"}`,
      }),
      (preview) => ({
        checkId: "priority_has_sources",
        passed: ["cisa_kev", "first_epss", "nvd_cve", "osv"].every((sourceId) => preview.priorityQueue[0]?.citations.includes(sourceId)),
        detail: "priority queue cites planned public CVE sources",
      }),
      (_, serialized) => ({
        checkId: "hostname_suppressed",
        passed: !serialized.includes("secret-prod-api.internal"),
        detail: "private hostname does not appear in preview",
      }),
    ],
  },
  {
    caseId: "wallet_and_note_redaction",
    title: "Wallet-looking values and private notes do not echo",
    input: {
      caseTitle: "Review 0x1111111111111111111111111111111111111111",
      cves: ["CVE-2024-0002"],
      notes: ["secret operator note with api key"],
    },
    checks: [
      (_, serialized) => ({
        checkId: "wallet_redacted",
        passed: !serialized.includes("0x1111111111111111111111111111111111111111") && serialized.includes("[redacted_wallet]"),
        detail: "wallet-looking input is redacted from title and output",
      }),
      (_, serialized) => ({
        checkId: "note_body_suppressed",
        passed: !serialized.includes("secret operator note"),
        detail: "private note body is hashed only",
      }),
    ],
  },
  {
    caseId: "compliance_review_gate",
    title: "Non-pass compliance proof requires human review",
    input: {
      complianceProofs: [
        {
          subjectCommitment: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          decision: "review",
        },
      ],
    },
    checks: [
      (preview) => ({
        checkId: "human_review_required",
        passed: preview.humanReviewQueue.some((item) => /KYT|sanctions|proof/i.test(item)),
        detail: "human review queue mentions KYT/sanctions proof commitment",
      }),
      (preview) => ({
        checkId: "legal_clearance_blocked",
        passed: preview.blockedActions.some((item) => /legal-compliance|sanctions/i.test(item)),
        detail: "blocked actions include legal/sanctions clearance claims",
      }),
    ],
  },
  {
    caseId: "no_provider_no_side_effects",
    title: "Preview remains rules-only and side-effect free",
    input: {
      cves: ["CVE-2024-0003"],
      cryptoIncidents: [{ protocol: "ExampleBridge", chain: "Ethereum", rootCause: "signature validation failure" }],
    },
    checks: [
      (preview) => ({
        checkId: "no_model_calls",
        passed: preview.modelRuntime.modelCallsMade === 0 && !preview.modelRuntime.localGpuUsed && !preview.modelRuntime.paidApiUsed,
        detail: "modelCallsMade=0, localGpuUsed=false, paidApiUsed=false",
      }),
      (preview) => ({
        checkId: "blocked_actions_present",
        passed: preview.blockedActions.some((item) => /external scans/i.test(item)) && preview.blockedActions.some((item) => /exploit payloads/i.test(item)),
        detail: "blocked scan and exploit actions remain visible",
      }),
      (preview) => ({
        checkId: "side_effects_none",
        passed: preview.safety.sideEffects === "none" && !preview.safety.activeScanningAllowed,
        detail: "route safety stays side-effect free",
      }),
    ],
  },
];
