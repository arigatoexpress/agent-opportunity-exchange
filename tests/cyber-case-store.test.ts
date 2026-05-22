import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { buildCyberExpertCaseStorePreview, CYBER_EXPERT_CASE_STORE_SCHEMA_ID } from "../src/adapters/cyber-case-store.js";
import { productRoutes, products, sources, streams } from "../src/catalog.js";

describe("cyber expert case store", () => {
  test("normalizes authorized evidence into RAG-ready packets without echoing private values", () => {
    const report = buildCyberExpertCaseStorePreview({
      caseTitle: "Example buyer 0x1111111111111111111111111111111111111111 case",
      inventory: {
        buyer: { name: "Example Buyer" },
        assets: [
          {
            hostname: "prod-db-01.internal",
            assetId: "asset-123",
            cves: ["CVE-2024-0001"],
            criticality: "critical",
            internetFacing: true,
          },
        ],
      },
      cryptoIncidents: [
        {
          protocol: "ExampleSwap",
          chain: "Base",
          rootCause: "oracle manipulation",
          controlsFailed: ["price oracle bounds"],
          sourceUrls: ["https://example.com/postmortem"],
        },
      ],
      complianceProofs: [
        {
          subjectCommitment: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          decision: "review",
          policyVersion: "aoe.compliance.v1",
          sourceMerkleRoot: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      ],
      notes: ["API key should not echo. private_key also should not echo."],
    });

    expect(report.schemaId).toBe(CYBER_EXPERT_CASE_STORE_SCHEMA_ID);
    expect(report.case.title).toContain("[redacted_wallet]");
    expect(report.inputSummary.cveCount).toBe(1);
    expect(report.inputSummary.assetRows).toBe(1);
    expect(report.inputSummary.cryptoIncidentCount).toBe(1);
    expect(report.inputSummary.complianceProofCount).toBe(1);
    expect(report.inputSummary.privateSignalsSuppressed).toBeGreaterThanOrEqual(3);
    expect(report.evidenceRecords.map((record) => record.kind)).toEqual(
      expect.arrayContaining(["vulnerability_signal", "crypto_incident_signal", "compliance_proof_signal", "operator_note_signal"]),
    );
    const vulnRecord = report.evidenceRecords.find((record) => record.kind === "vulnerability_signal");
    expect(vulnRecord).toBeTruthy();
    const sourceEvidence = vulnRecord?.sourceEvidence ?? [];
    expect(sourceEvidence).toContainEqual(
      expect.objectContaining({
        sourceId: "cisa_kev",
        owner: "Cybersecurity and Infrastructure Security Agency",
        rightsLicenseId: "public_official_derived_facts",
        retrievedAt: "not_retrieved_in_preview",
      }),
    );
    expect(sourceEvidence[0]).toEqual(expect.objectContaining({ retrievalMode: vulnRecord?.retrievalMode, ttlSeconds: vulnRecord?.ttlSeconds }));
    expect(report.ragDocuments.length).toBe(report.evidenceRecords.length);
    expect(report.evidenceProof.caseHash).toMatch(/^sha256:/);
    expect(report.safety.activeScanningAllowed).toBe(false);
    expect(report.safety.rawWalletAddressEchoAllowed).toBe(false);
    expect(report.safety.privateHostnamesEchoAllowed).toBe(false);

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("prod-db-01.internal");
    expect(serialized).not.toContain("asset-123");
    expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
    expect(serialized).not.toContain("API key");
    expect(serialized).not.toContain("private_key");
    expect(serialized.toLowerCase()).not.toContain("payload:");
  });

  test("registers product, stream, route, and sources", async () => {
    const product = products.find((row) => row.productId === "cyber_expert_case_store_pack");
    expect(product?.schemaId).toBe("aoe.product.cyber_expert_case_store_pack.v1");
    expect(product?.disclaimers).toContain("Defensive prioritization only.");
    expect(product?.disclaimers).toContain("No exploit payloads or credential material.");

    const stream = streams.find((row) => row.streamId === "cyber_expert_case_store");
    expect(stream?.route).toBe("/v1/streams/cyber-expert/case-store");
    expect(stream?.caveats.join(" ")).toMatch(/No raw private inventory/i);

    const route = productRoutes.find((row) => row.routeId === "cyber_expert_case_store");
    expect(route).toEqual(
      expect.objectContaining({
        schemaId: CYBER_EXPERT_CASE_STORE_SCHEMA_ID,
        access: "public",
        readiness: "live_read_only",
      }),
    );

    const sourceIds = sources.map((source) => source.sourceId);
    expect(sourceIds).toContain("buyer_authorized_inventory");
    expect(sourceIds).toContain("crypto_incident_public_metadata");
    for (const expectedSourceId of route?.sourceIds ?? []) {
      expect(sourceIds).toContain(expectedSourceId);
    }

    const app = createApp();
    const res = await app.request("/v1/streams/cyber-expert/case-store", {
      method: "POST",
      body: JSON.stringify({ cves: ["CVE-2024-0001"] }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.readOnly).toBe(true);
    expect(body.sideEffects).toBe("none");
    expect(body.report.schemaId).toBe(CYBER_EXPERT_CASE_STORE_SCHEMA_ID);
    expect(body.report.evidenceRecords[0].sourceIds).toContain("cisa_kev");
    expect(body.report.evidenceRecords[0].sourceEvidence[0]).toEqual(
      expect.objectContaining({
        sourceId: "buyer_authorized_inventory",
        rightsRisk: "yellow",
      }),
    );
  });

  test("rejects raw compliance fields not in the commitment-only schema", async () => {
    const app = createApp();
    const res = await app.request("/v1/streams/cyber-expert/case-store", {
      method: "POST",
      body: JSON.stringify({
        complianceProofs: [
          {
            walletAddress: "0x1111111111111111111111111111111111111111",
            decision: "review",
          },
        ],
      }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_cyber_expert_case_store_payload");
  });
});
