import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { buildCyberExpertHarnessBlueprint, CYBER_EXPERT_HARNESS_SCHEMA_ID } from "../src/adapters/cyber-expert.js";
import { productRoutes, products, sources, streams } from "../src/catalog.js";

describe("cyber expert harness blueprint", () => {
  test("builds a defensive MDASH-inspired harness contract", () => {
    const blueprint = buildCyberExpertHarnessBlueprint({ focus: "all", localGpu: true });

    expect(blueprint.schemaId).toBe(CYBER_EXPERT_HARNESS_SCHEMA_ID);
    expect(blueprint.productId).toBe("cyber_expert_harness_blueprint");
    expect(blueprint.architecture.pipeline.map((stage) => stage.stage)).toEqual(["prepare", "scan", "validate", "dedup", "prove", "report"]);
    expect(blueprint.researchBasis.map((source) => source.sourceId)).toEqual(
      expect.arrayContaining(["microsoft_mdash_blog", "cybergym_benchmark", "oss_crs", "trm_sanctions_docs", "ofac_sanctions_lists"]),
    );
    expect(blueprint.modelAndRuntimePlan.localFirst).toBe(true);
    expect(blueprint.modelAndRuntimePlan.trainingPlan.recommendation).toMatch(/RAG/i);
    expect(blueprint.dataAndProofPlan.proofObject.privateFields).toContain("raw wallet address");
    expect(blueprint.safety.activeScanningAllowed).toBe(false);
    expect(blueprint.safety.exploitPayloadGenerationAllowed).toBe(false);
    expect(blueprint.evidenceProof.blueprintHash).toMatch(/^sha256:/);

    const serialized = JSON.stringify(blueprint).toLowerCase();
    expect(serialized).toContain("no active scanning");
    expect(serialized).toContain("no exploit payload");
    expect(serialized).not.toContain("run this exploit");
    expect(serialized).not.toContain("payload:");
  });

  test("narrows tracks when a focus is requested", () => {
    const blueprint = buildCyberExpertHarnessBlueprint({
      focus: "compliance_proofs",
      includeMicrosoftPattern: false,
      includeOpenSourceCrs: false,
    });

    expect(blueprint.focus.enabledTracks).toEqual(["private KYT/sanctions screening with public-safe proof commitments"]);
    expect(blueprint.researchBasis.map((source) => source.sourceId)).toEqual(["trm_sanctions_docs", "ofac_sanctions_lists"]);
    expect(blueprint.architecture.agentRoles.map((agent) => agent.agentId)).toContain("compliance_proof_writer");
  });

  test("is registered as a product, stream, source-backed route, and live-read-only endpoint", async () => {
    const product = products.find((row) => row.productId === "cyber_expert_harness_blueprint");
    expect(product?.schemaId).toBe("aoe.product.cyber_expert_harness_blueprint.v1");
    expect(product?.liveSettlementAllowed).toBe(false);
    expect(product?.externalSideEffectsAllowed).toBe(false);
    expect(product?.disclaimers.join(" ")).toMatch(/No exploit payloads/i);

    const stream = streams.find((row) => row.streamId === "cyber_expert_harness_blueprint");
    expect(stream?.route).toBe("/v1/streams/cyber-expert-harness/blueprint");
    expect(stream?.caveats.join(" ")).toMatch(/No active scanning/i);

    const route = productRoutes.find((row) => row.routeId === "cyber_expert_harness_blueprint");
    expect(route).toEqual(
      expect.objectContaining({
        schemaId: CYBER_EXPERT_HARNESS_SCHEMA_ID,
        access: "public",
        readiness: "live_read_only",
      }),
    );

    const sourceIds = sources.map((source) => source.sourceId);
    for (const expectedSourceId of route?.sourceIds ?? []) {
      expect(sourceIds).toContain(expectedSourceId);
    }

    const app = createApp();
    const res = await app.request("/v1/streams/cyber-expert-harness/blueprint", {
      method: "POST",
      body: JSON.stringify({ focus: "crypto_exploit_intel", localGpu: true }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.readOnly).toBe(true);
    expect(body.sideEffects).toBe("none");
    expect(body.report.schemaId).toBe(CYBER_EXPERT_HARNESS_SCHEMA_ID);
    expect(body.report.focus.enabledTracks).toEqual(["crypto exploit intelligence and protocol-risk synthesis"]);
  });
});
