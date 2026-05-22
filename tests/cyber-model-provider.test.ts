import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { resolveCyberModelProvider } from "../src/adapters/cyber-model-provider.js";
import { productRoutes } from "../src/catalog.js";

describe("cyber model provider gate", () => {
  test("defaults to rules-only with no external calls", () => {
    const provider = resolveCyberModelProvider({});

    expect(provider.provider).toBe("rules_only_no_model_call");
    expect(provider.requestedProvider).toBe("rules_only_no_model_call");
    expect(provider.status).toBe("active_rules_only");
    expect(provider.modelCallsMade).toBe(0);
    expect(provider.localGpuUsed).toBe(false);
    expect(provider.paidApiUsed).toBe(false);
  });

  test("blocks future Windows provider unless explicit gates and config exist", () => {
    expect(resolveCyberModelProvider({ AOE_CYBER_MODEL_PROVIDER: "windows_ollama_capped_worker" }).status).toBe(
      "blocked_requires_explicit_enable",
    );
    expect(
      resolveCyberModelProvider({
        AOE_CYBER_MODEL_PROVIDER: "windows_ollama_capped_worker",
        AOE_CYBER_MODEL_PROVIDER_ENABLED: "true",
      }).status,
    ).toBe("blocked_requires_eval_pass");
    expect(
      resolveCyberModelProvider({
        AOE_CYBER_MODEL_PROVIDER: "windows_ollama_capped_worker",
        AOE_CYBER_MODEL_PROVIDER_ENABLED: "true",
        AOE_CYBER_MODEL_EVAL_PASSED: "true",
      }).status,
    ).toBe("blocked_missing_provider_config");
    expect(
      resolveCyberModelProvider({
        AOE_CYBER_MODEL_PROVIDER: "windows_ollama_capped_worker",
        AOE_CYBER_MODEL_PROVIDER_ENABLED: "true",
        AOE_CYBER_MODEL_EVAL_PASSED: "true",
        AOE_WINDOWS_OLLAMA_URL: "http://192.168.1.61:11434",
      }).status,
    ).toBe("blocked_missing_provider_config");
    expect(
      resolveCyberModelProvider({
        AOE_CYBER_MODEL_PROVIDER: "windows_ollama_capped_worker",
        AOE_CYBER_MODEL_PROVIDER_ENABLED: "true",
        AOE_CYBER_MODEL_EVAL_PASSED: "true",
        AOE_WINDOWS_OLLAMA_URL: "http://192.168.1.61:11434",
        AOE_CYBER_MODEL_NAME: "qwen3:8b",
      }).status,
    ).toBe("blocked_requires_chat_allowlist");

    const ready = resolveCyberModelProvider({
      AOE_CYBER_MODEL_PROVIDER: "windows_ollama_capped_worker",
      AOE_CYBER_MODEL_PROVIDER_ENABLED: "true",
      AOE_CYBER_MODEL_EVAL_PASSED: "true",
      AOE_CYBER_MODEL_CHAT_ALLOWED: "true",
      AOE_WINDOWS_OLLAMA_URL: "http://192.168.1.61:11434",
      AOE_CYBER_MODEL_NAME: "qwen3:8b",
    });
    expect(ready.provider).toBe("windows_ollama_capped_worker");
    expect(ready.status).toBe("ready_windows_ollama_capped_worker");
    expect(ready.gate.modelNameHash).toMatch(/^sha256:/);
    expect(JSON.stringify(ready)).not.toContain("qwen3:8b");
  });

  test("never activates paid or GPU providers from config alone", () => {
    const openai = resolveCyberModelProvider({
      AOE_CYBER_MODEL_PROVIDER: "openai_supervised_summary_adapter",
      AOE_CYBER_MODEL_PROVIDER_ENABLED: "true",
      AOE_CYBER_MODEL_EVAL_PASSED: "true",
      OPENAI_API_KEY: "test-key-redacted",
    });

    expect(openai.provider).toBe("rules_only_no_model_call");
    expect(openai.status).toBe("blocked_adapter_not_implemented");
    expect(openai.modelCallsMade).toBe(0);
    expect(openai.paidApiUsed).toBe(false);
  });

  test("requires current eval suite hash when supplied by live routes", () => {
    const currentEvalSuiteHash = "sha256:current-eval-suite";
    const baseEnv = {
      AOE_CYBER_MODEL_PROVIDER: "windows_ollama_capped_worker",
      AOE_CYBER_MODEL_PROVIDER_ENABLED: "true",
      AOE_CYBER_MODEL_EVAL_PASSED: "true",
      AOE_CYBER_MODEL_CHAT_ALLOWED: "true",
      AOE_WINDOWS_OLLAMA_URL: "http://192.168.1.61:11434",
      AOE_CYBER_MODEL_NAME: "qwen3:8b",
    };

    const blocked = resolveCyberModelProvider(baseEnv, currentEvalSuiteHash);
    expect(blocked.status).toBe("blocked_requires_eval_hash");
    expect(blocked.provider).toBe("rules_only_no_model_call");
    expect(blocked.gate.evalHashRequired).toBe(true);
    expect(blocked.gate.evalHashAcknowledged).toBe(false);

    const ready = resolveCyberModelProvider({ ...baseEnv, AOE_CYBER_MODEL_EVAL_SUITE_HASH: currentEvalSuiteHash }, currentEvalSuiteHash);
    expect(ready.status).toBe("ready_windows_ollama_capped_worker");
    expect(ready.provider).toBe("windows_ollama_capped_worker");
    expect(ready.gate.evalHashAcknowledged).toBe(true);
  });

  test("exposes provider status without echoing environment values or calling providers", async () => {
    const route = productRoutes.find((row) => row.routeId === "cyber_expert_provider_status");
    expect(route).toEqual(
      expect.objectContaining({
        route: "/v1/streams/cyber-expert/provider-status",
        method: "GET",
        schemaId: "aoe.cyber_expert_provider_status.v1",
        x402Stream: false,
        readiness: "live_read_only",
      }),
    );

    const restoreEnv = snapshotCyberModelEnv();
    process.env.AOE_CYBER_MODEL_PROVIDER = "openai_supervised_summary_adapter";
    try {
      const res = await createApp().request("/v1/streams/cyber-expert/provider-status");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.schemaId).toBe("aoe.cyber_expert_provider_status.v1");
      expect(body.readOnly).toBe(true);
      expect(body.sideEffects).toBe("none");
      expect(body.secretValuesEchoed).toBe(false);
      expect(body.modelCallsMade).toBe(0);
      expect(body.provider.provider).toBe("rules_only_no_model_call");
      expect(body.provider.requestedProvider).toBe("openai_supervised_summary_adapter");
      if (process.env.OPENAI_API_KEY) {
        expect(JSON.stringify(body)).not.toContain(process.env.OPENAI_API_KEY);
      }
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
    "AOE_CYBER_MODEL_NUM_PREDICT",
    "AOE_CYBER_MODEL_KEEP_ALIVE",
    "AOE_WINDOWS_OLLAMA_URL",
    "AOE_WINDOWS_OLLAMA_TIMEOUT_MS",
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
