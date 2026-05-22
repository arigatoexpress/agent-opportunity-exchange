import { sha256 } from "../hash.js";

export const COMPLIANCE_DECISION_PREVIEW_SCHEMA_ID = "aoe.compliance_decision_preview.v1";

export type ComplianceDecision = "pass" | "deny" | "review" | "expired" | "unknown";
export type ComplianceSourceId = "ofac_sanctions_lists" | "trm_sanctions_docs";

export interface ComplianceDecisionPreviewRequest {
  subjectCommitment: string;
  decision?: ComplianceDecision;
  policyVersion?: string;
  sourceMerkleRoot?: string;
  issuedAt?: string;
  expiresAt?: string;
  sourceIds?: ComplianceSourceId[];
}

export interface ComplianceDecisionPreview {
  schemaId: typeof COMPLIANCE_DECISION_PREVIEW_SCHEMA_ID;
  generatedAt: string;
  mode: "commitment_only_screening_decision_preview";
  x402Stream: true;
  productId: "cyber_expert_case_store_pack";
  readOnly: true;
  sideEffects: "none";
  sourceIds: ComplianceSourceId[];
  decision: {
    decision: ComplianceDecision;
    policyVersion: string;
    issuedAt: string;
    expiresAt: string | null;
    subjectCommitment: string;
    sourceMerkleRoot: string | null;
    privateScreeningRequired: true;
    subjectCommitmentAccepted: true;
    rawSubjectAccepted: false;
    rawWalletAddressAccepted: false;
    rawVendorPayloadAccepted: false;
    publicProofStatus: "commitment_only_not_sanctions_clearance";
  };
  safety: {
    rawWalletAddressEchoAllowed: false;
    rawVendorPayloadEchoAllowed: false;
    liveTrmCallMade: false;
    liveOfacScreeningCallMade: false;
    onChainProofPosted: false;
    sanctionsClearanceClaimed: false;
    liveSettlementAllowed: false;
    externalSideEffectsAllowed: false;
    outputPolicy: string[];
  };
  evidenceProof: {
    algorithm: "sha256";
    canonicalization: "stable-json-sorted-keys-v1";
    decisionPreviewHash: string;
    subjectCommitmentHash: string;
  };
  caveats: string[];
}

export function buildComplianceDecisionPreview(request: ComplianceDecisionPreviewRequest): ComplianceDecisionPreview {
  const sourceIds: ComplianceSourceId[] = request.sourceIds?.length
    ? ([...new Set(request.sourceIds)].sort() as ComplianceSourceId[])
    : ["ofac_sanctions_lists", "trm_sanctions_docs"];
  const issuedAt = request.issuedAt ?? new Date().toISOString();
  const withoutProof = {
    schemaId: COMPLIANCE_DECISION_PREVIEW_SCHEMA_ID as typeof COMPLIANCE_DECISION_PREVIEW_SCHEMA_ID,
    generatedAt: new Date().toISOString(),
    mode: "commitment_only_screening_decision_preview" as const,
    x402Stream: true as const,
    productId: "cyber_expert_case_store_pack" as const,
    readOnly: true as const,
    sideEffects: "none" as const,
    sourceIds,
    decision: {
      decision: request.decision ?? "review",
      policyVersion: request.policyVersion ?? "policy-unset",
      issuedAt,
      expiresAt: request.expiresAt ?? null,
      subjectCommitment: request.subjectCommitment,
      sourceMerkleRoot: request.sourceMerkleRoot ?? null,
      privateScreeningRequired: true as const,
      subjectCommitmentAccepted: true as const,
      rawSubjectAccepted: false as const,
      rawWalletAddressAccepted: false as const,
      rawVendorPayloadAccepted: false as const,
      publicProofStatus: "commitment_only_not_sanctions_clearance" as const,
    },
    safety: {
      rawWalletAddressEchoAllowed: false as const,
      rawVendorPayloadEchoAllowed: false as const,
      liveTrmCallMade: false as const,
      liveOfacScreeningCallMade: false as const,
      onChainProofPosted: false as const,
      sanctionsClearanceClaimed: false as const,
      liveSettlementAllowed: false as const,
      externalSideEffectsAllowed: false as const,
      outputPolicy: [
        "Accept commitment, Merkle root, policy version, decision, and expiry metadata only.",
        "Do not accept or echo raw wallet addresses, raw vendor screening payloads, customer identifiers, secrets, or private notes.",
        "This preview is not sanctions clearance; a private authorized screening adapter and compliance review are required before any allow/deny claim.",
        "No on-chain proof is posted by this route.",
      ],
    },
    caveats: [
      "Commitment previews are useful for public proof rails, but they do not prove that the underlying subject is unsanctioned.",
      "TRM/KYT data is treated as private partner output and is not fetched, trained on, or redistributed here.",
      "OFAC public list material can inform private screening, but final decisions need freshness, policy versioning, and human review.",
    ],
  };

  return {
    ...withoutProof,
    evidenceProof: {
      algorithm: "sha256",
      canonicalization: "stable-json-sorted-keys-v1",
      decisionPreviewHash: sha256(withoutProof),
      subjectCommitmentHash: sha256({
        subjectCommitment: request.subjectCommitment,
        sourceMerkleRoot: request.sourceMerkleRoot ?? null,
        policyVersion: request.policyVersion ?? "policy-unset",
      }),
    },
  };
}
