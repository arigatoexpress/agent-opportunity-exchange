import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { buildCyberExpertModelPreview, CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID } from "../src/adapters/cyber-model-preview.js";
import { productRoutes, products, streams } from "../src/catalog.js";

describe("cyber expert model preview", () => {
  test("builds a no-provider-call model response contract from case-store evidence", () => {
    const preview = buildCyberExpertModelPreview({
      caseTitle: "Model smoke 0x1111111111111111111111111111111111111111",
      inventory: {
        assets: [
          {
            hostname: "prod-api-01.internal",
            cves: ["CVE-2024-0001"],
            criticality: "critical",
            internetFacing: true,
          },
        ],
      },
      cryptoIncidents: [{ protocol: "ExampleSwap", chain: "Base", rootCause: "oracle manipulation" }],
      complianceProofs: [{ decision: "review", subjectCommitment: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }],
      notes: ["Do not echo this private operator note."],
    });

    expect(preview.schemaId).toBe(CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID);
    expect(preview.modelRuntime).toEqual(
      expect.objectContaining({
        provider: "rules_only_no_model_call",
        modelCallsMade: 0,
        localGpuUsed: false,
        paidApiUsed: false,
      }),
    );
    expect(preview.priorityQueue[0]).toEqual(
      expect.objectContaining({
        tier: "fix_today",
        citations: expect.arrayContaining(["vuln_cve_2024_0001", "cisa_kev", "first_epss", "nvd_cve", "osv"]),
      }),
    );
    expect(preview.cryptoExploitNotes[0].defensiveTheme).toMatch(/oracle manipulation/i);
    expect(preview.complianceProofNotes[0].posture).toMatch(/Human review required/i);
    expect(preview.humanReviewQueue.join(" ")).toMatch(/Review/i);
    expect(preview.blockedActions.join(" ")).toMatch(/Do not run external scans/i);
    expect(preview.safety.modelOutputAuthoritative).toBe(false);
    expect(preview.evidenceProof.previewHash).toMatch(/^sha256:/);

    const serialized = JSON.stringify(preview);
    expect(serialized).not.toContain("prod-api-01.internal");
    expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
    expect(serialized).not.toContain("Do not echo this private operator note");
  });

  test("stays deterministic even when live provider env is configured", () => {
    const restoreEnv = snapshotCyberModelEnv();
    Object.assign(process.env, {
      AOE_CYBER_MODEL_PROVIDER: "windows_ollama_capped_worker",
      AOE_CYBER_MODEL_PROVIDER_ENABLED: "true",
      AOE_CYBER_MODEL_EVAL_PASSED: "true",
      AOE_CYBER_MODEL_CHAT_ALLOWED: "true",
      AOE_WINDOWS_OLLAMA_URL: "http://192.0.2.10:11434",
      AOE_CYBER_MODEL_NAME: "qwen3:8b",
    });
    try {
      const preview = buildCyberExpertModelPreview({ cves: ["CVE-2024-0001"] });
      expect(preview.mode).toBe("deterministic_model_contract_preview");
      expect(preview.modelRuntime.provider).toBe("rules_only_no_model_call");
      expect(preview.modelRuntime.modelCallsMade).toBe(0);
      expect(preview.modelRuntime.localGpuUsed).toBe(false);
      expect(JSON.stringify(preview)).not.toContain("qwen3:8b");
      expect(JSON.stringify(preview)).not.toContain("192.0.2.10");
    } finally {
      restoreEnv();
    }
  });

  test("registers product, stream, route, and endpoint", async () => {
    const product = products.find((row) => row.productId === "cyber_expert_model_preview_pack");
    expect(product?.schemaId).toBe("aoe.product.cyber_expert_model_preview_pack.v1");
    expect(product?.disclaimers).toContain("Defensive prioritization only.");
    expect(product?.disclaimers).toContain("No exploit payloads or credential material.");

    const stream = streams.find((row) => row.streamId === "cyber_expert_model_preview");
    expect(stream?.route).toBe("/v1/streams/cyber-expert/model-preview");
    expect(stream?.caveats.join(" ")).toMatch(/No model provider calls/i);

    const route = productRoutes.find((row) => row.routeId === "cyber_expert_model_preview");
    expect(route).toEqual(
      expect.objectContaining({
        schemaId: CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID,
        access: "public",
        readiness: "live_read_only",
      }),
    );

    const app = createApp();
    const res = await app.request("/v1/streams/cyber-expert/model-preview", {
      method: "POST",
      body: JSON.stringify({ cves: ["CVE-2024-0001"] }),
      headers: { "Content-Type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.readOnly).toBe(true);
    expect(body.sideEffects).toBe("none");
    expect(body.report.schemaId).toBe(CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID);
    expect(body.report.modelRuntime.modelCallsMade).toBe(0);
    expect(body.report.caseStore.schemaId).toBe("aoe.cyber_expert_case_store.preview.v1");
  });
});

function snapshotCyberModelEnv() {
  const keys = [
    "AOE_CYBER_MODEL_PROVIDER",
    "AOE_CYBER_MODEL_PROVIDER_ENABLED",
    "AOE_CYBER_MODEL_EVAL_PASSED",
    "AOE_CYBER_MODEL_EVAL_SUITE_HASH",
    "AOE_CYBER_MODEL_CHAT_ALLOWED",
    "AOE_CYBER_MODEL_NAME",
    "AOE_CYBER_MODEL_NUM_PREDICT",
    "AOE_CYBER_MODEL_KEEP_ALIVE",
    "AOE_WINDOWS_OLLAMA_URL",
    "OPENAI_API_KEY",
    "GOOGLE_CLOUD_PROJECT",
    "VLLM_BASE_URL",
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  return () => {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}
