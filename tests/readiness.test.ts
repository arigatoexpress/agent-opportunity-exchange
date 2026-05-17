import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { buildReadiness } from "../src/readiness.js";
import { buildCyberExpertEvalReport } from "../src/adapters/cyber-evals.js";

describe("adapter readiness", () => {
  test("keeps adapter side effects explicit and settlement disabled", () => {
    const readiness = buildReadiness();
    const allowedSideEffects = new Set([
      "none",
      "public_cve_source_fetch_only",
      "public_chain_receipt_fetch_only",
      "local_model_inference_only",
      "deterministic_analysis_plus_optional_public_fetch_and_optional_local_inference",
    ]);
    expect(readiness.schemaId).toBe("aoe.readiness.v1");
    expect(readiness.liveSettlementAllowed).toBe(false);
    expect(readiness.externalSideEffectsAllowed).toBe(false);
    expect(readiness.counts.live_read_only).toBeGreaterThanOrEqual(4);
    for (const adapter of readiness.adapters) {
      expect(allowedSideEffects.has(adapter.sideEffects)).toBe(true);
      expect(adapter.liveSettlementAllowed).toBe(false);
    }
    expect(readiness.adapters.find((adapter) => adapter.adapterId === "cyber_ollama_model_preview")?.sideEffects).toBe(
      "local_model_inference_only",
    );
    expect(readiness.adapters.find((adapter) => adapter.adapterId === "cyber_public_cve_refresh")?.sideEffects).toBe(
      "public_cve_source_fetch_only",
    );
    expect(readiness.adapters.find((adapter) => adapter.adapterId === "cyber_expert_case_brief")?.sideEffects).toBe(
      "deterministic_analysis_plus_optional_public_fetch_and_optional_local_inference",
    );
    expect(readiness.adapters.find((adapter) => adapter.adapterId === "compliance_decision_preview")?.sideEffects).toBe("none");
    expect(readiness.adapters.find((adapter) => adapter.adapterId === "zero_g_proof_readiness")?.sideEffects).toBe(
      "public_chain_receipt_fetch_only",
    );
  });

  test("reports buyer-discovery contract coverage", () => {
    const readiness = buildReadiness();
    expect(readiness.contracts.buyerDiscoveryReady).toBe(true);
    expect(readiness.contracts.products.count).toBeGreaterThan(0);
    expect(readiness.contracts.products.missingSchemaIds).toEqual([]);
    expect(readiness.contracts.products.missingQualityMetadata).toEqual([]);
    expect(readiness.contracts.products.schemaIds).toContain("aoe.product.cyber_exploited_vuln_priority.v1");
    expect(readiness.contracts.routes.discoveryEndpoint).toBe("/v1/routes");
    expect(readiness.contracts.routes.count).toBeGreaterThanOrEqual(10);
    expect(readiness.contracts.routes.missingSchemaIds).toEqual([]);
    expect(readiness.contracts.routes.paidContentRouteIds).toContain("artifact_paid_content");
    expect(readiness.contracts.routes.publicCount).toBeGreaterThanOrEqual(12);
  });

  test("marks wildfire adapters as separate from x402 streams", () => {
    const readiness = buildReadiness();
    const wildfireAdapters = readiness.adapters.filter((adapter) => adapter.adapterId.startsWith("wildfire_"));
    expect(wildfireAdapters.length).toBeGreaterThan(0);
    for (const adapter of wildfireAdapters) {
      expect(adapter.productId).toBeNull();
      expect(adapter.x402Stream).toBe(false);
      expect(adapter.workstreamId).toBe("wildfire_drone_readiness_lane");
    }
  });

  test("exposes readiness API", async () => {
    const res = await createApp().request("/v1/readiness");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contracts.buyerDiscoveryReady).toBe(true);
    expect(body.contracts.routes.discoveryEndpoint).toBe("/v1/routes");
    expect(body.adapters.map((adapter: { adapterId: string }) => adapter.adapterId)).toContain("cyber_vuln_priority");
    expect(body.adapters.map((adapter: { adapterId: string }) => adapter.adapterId)).toContain("market_sec_macro_context");
    expect(body.adapters.map((adapter: { adapterId: string }) => adapter.adapterId)).toContain("cyber_expert_case_brief_report");
    expect(body.adapters.map((adapter: { adapterId: string }) => adapter.adapterId)).toContain("compliance_decision_preview");
    expect(body.adapters.map((adapter: { adapterId: string }) => adapter.adapterId)).toContain("zero_g_proof_readiness");
    const opportunity = body.adapters.find((adapter: { adapterId: string }) => adapter.adapterId === "opportunity_public_programs");
    expect(opportunity).toEqual(
      expect.objectContaining({
        productId: "opportunity_intel_pack",
        x402Stream: true,
        status: "live_read_only",
        endpoint: "/v1/adapters/opportunities/public-programs/preview",
      }),
    );
    expect(opportunity.notes.join(" ")).toContain("SAM.gov opportunities remain key-required");
    const telegram = body.adapters.find((adapter: { adapterId: string }) => adapter.adapterId === "telegram_mini_app_registration");
    expect(telegram).toEqual(
      expect.objectContaining({
        workstreamId: "telegram_mini_app_opt_in",
        x402Stream: false,
        endpoint: "/v1/telegram/register",
      }),
    );
    expect(["key_required", "configured_stub"]).toContain(telegram.status);
    expect(telegram.notes.join(" ")).toContain("No Telegram sends");
  });

  test("marks Ollama preview as gate-ready but unprobed when all model gates match", () => {
    const restoreEnv = snapshotCyberModelEnv();
    const evalSuiteHash = buildCyberExpertEvalReport().evidenceProof.evalSuiteHash;
    process.env.AOE_CYBER_MODEL_PROVIDER = "windows_ollama_capped_worker";
    process.env.AOE_CYBER_MODEL_PROVIDER_ENABLED = "true";
    process.env.AOE_CYBER_MODEL_EVAL_PASSED = "true";
    process.env.AOE_CYBER_MODEL_EVAL_SUITE_HASH = evalSuiteHash;
    process.env.AOE_CYBER_MODEL_CHAT_ALLOWED = "true";
    process.env.AOE_WINDOWS_OLLAMA_URL = "http://192.0.2.10:11434";
    process.env.AOE_CYBER_MODEL_NAME = "qwen3:8b";

    try {
      const readiness = buildReadiness();
      const ollama = readiness.adapters.find((adapter) => adapter.adapterId === "cyber_ollama_model_preview");
      expect(ollama?.status).toBe("configured_stub");
      expect(ollama?.notes.join(" ")).toContain("Gate-ready means configured but unprobed");
      expect(ollama?.notes.join(" ")).toContain("simulated x402 access is required");
    } finally {
      restoreEnv();
    }
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
    "AOE_WINDOWS_OLLAMA_URL",
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  return () => {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}
