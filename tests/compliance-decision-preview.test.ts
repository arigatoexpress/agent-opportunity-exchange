import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import {
  buildComplianceDecisionPreview,
  COMPLIANCE_DECISION_PREVIEW_SCHEMA_ID,
} from "../src/adapters/compliance-decision-preview.js";
import { productRoutes, streams } from "../src/catalog.js";

describe("compliance decision preview", () => {
  test("builds commitment-only proof metadata without clearance claims", () => {
    const report = buildComplianceDecisionPreview({
      subjectCommitment: "commitment:demo_subject_screening_2026_05_17",
      decision: "review",
      policyVersion: "policy-v1",
      sourceMerkleRoot: "merkle:demo_source_root_2026_05_17",
      sourceIds: ["ofac_sanctions_lists", "trm_sanctions_docs"],
    });

    expect(report.schemaId).toBe(COMPLIANCE_DECISION_PREVIEW_SCHEMA_ID);
    expect(report.decision.privateScreeningRequired).toBe(true);
    expect(report.decision.rawWalletAddressAccepted).toBe(false);
    expect(report.decision.rawVendorPayloadAccepted).toBe(false);
    expect(report.decision.publicProofStatus).toBe("commitment_only_not_sanctions_clearance");
    expect(report.safety.liveTrmCallMade).toBe(false);
    expect(report.safety.liveOfacScreeningCallMade).toBe(false);
    expect(report.safety.onChainProofPosted).toBe(false);
    expect(report.safety.sanctionsClearanceClaimed).toBe(false);
    expect(report.evidenceProof.decisionPreviewHash).toMatch(/^sha256:/);
  });

  test("registers stream and route", () => {
    const stream = streams.find((row) => row.streamId === "compliance_decision_preview");
    expect(stream?.route).toBe("/v1/compliance/screening/decision-preview");
    expect(stream?.sourceIds).toEqual(["ofac_sanctions_lists", "trm_sanctions_docs"]);

    const route = productRoutes.find((row) => row.routeId === "compliance_decision_preview");
    expect(route).toEqual(
      expect.objectContaining({
        route: "/v1/compliance/screening/decision-preview",
        access: "public",
        readiness: "live_read_only",
        schemaId: COMPLIANCE_DECISION_PREVIEW_SCHEMA_ID,
      }),
    );
    expect(route?.caveats.join(" ")).toContain("Raw wallet addresses");
  });

  test("app route accepts commitments and rejects raw wallet addresses without echoing them", async () => {
    const app = createApp();
    const accepted = await app.request("/v1/compliance/screening/decision-preview", {
      method: "POST",
      body: JSON.stringify({
        subjectCommitment: "commitment:demo_subject_screening_2026_05_17",
        decision: "review",
        policyVersion: "policy-v1",
        sourceMerkleRoot: "merkle:demo_source_root_2026_05_17",
        sourceIds: ["ofac_sanctions_lists", "trm_sanctions_docs"],
      }),
      headers: { "Content-Type": "application/json" },
    });
    expect(accepted.status).toBe(200);
    const acceptedBody = await accepted.json();
    expect(acceptedBody.report.schemaId).toBe(COMPLIANCE_DECISION_PREVIEW_SCHEMA_ID);
    expect(acceptedBody.report.decision.rawSubjectAccepted).toBe(false);
    expect(acceptedBody.report.safety.rawWalletAddressEchoAllowed).toBe(false);

    const rawWallet = "0x1111111111111111111111111111111111111111";
    const rejected = await app.request("/v1/compliance/screening/decision-preview", {
      method: "POST",
      body: JSON.stringify({
        subjectCommitment: rawWallet,
        decision: "pass",
      }),
      headers: { "Content-Type": "application/json" },
    });
    expect(rejected.status).toBe(400);
    const rejectedBody = await rejected.json();
    expect(rejectedBody.error).toBe("invalid_compliance_decision_preview_payload");
    expect(rejectedBody.rawWalletAddressAccepted).toBe(false);
    expect(JSON.stringify(rejectedBody)).not.toContain(rawWallet);
  });
});
