import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import {
  buildAllowedOllamaEndpoint,
  buildCyberOllamaModelPreview,
  CYBER_OLLAMA_MODEL_PREVIEW_SCHEMA_ID,
} from "../src/adapters/cyber-ollama-model.js";
import { productRoutes, streams } from "../src/catalog.js";
import { buildRoutePreviewQuote, expectedSimulatedPayment } from "../src/payments.js";

describe("cyber gated Windows Ollama model preview", () => {
  test("fails closed without provider gates and makes no fetch calls", async () => {
    const result = await buildCyberOllamaModelPreview({ cves: ["CVE-2024-0001"] }, {}, async () => {
      throw new Error("fetch should not be called without gates");
    });

    expect(result.schemaId).toBe(CYBER_OLLAMA_MODEL_PREVIEW_SCHEMA_ID);
    expect(result.localModel.status).toBe("blocked_by_provider_gate");
    expect(result.localModel.modelCallsMade).toBe(0);
    expect(result.localModel.calls.tagsEndpointCalled).toBe(false);
    expect(result.localModel.calls.chatEndpointCalled).toBe(false);
    expect(result.modelRuntime.provider).toBe("rules_only_no_model_call");
    expect(result.deterministicPreview.modelRuntime.provider).toBe("rules_only_no_model_call");
  });

  test("checks /api/tags and refuses chat when configured model is missing", async () => {
    const requests: string[] = [];
    const result = await buildCyberOllamaModelPreview(
      { cves: ["CVE-2024-0001"] },
      readyEnv(),
      async (url) => {
        requests.push(url);
        return jsonResponse({ models: [{ name: "other-model:latest" }] });
      },
    );

    expect(requests).toEqual(["http://192.0.2.10:11434/api/tags"]);
    expect(result.localModel.status).toBe("blocked_model_not_installed");
    expect(result.localModel.modelCallsMade).toBe(0);
    expect(result.localModel.calls.tagsEndpointCalled).toBe(true);
    expect(result.localModel.calls.chatEndpointCalled).toBe(false);
    expect(JSON.stringify(result)).not.toContain("qwen3:8b");
    expect(JSON.stringify(result)).not.toContain("192.0.2.10");
  });

  test("calls /api/chat once with capped options when all gates and model presence pass", async () => {
    const requests: Array<{ url: string; init?: RequestInit; body?: any }> = [];
    const result = await buildCyberOllamaModelPreview(
      {
        inventory: {
          assets: [{ hostname: "prod-api.internal", cves: ["CVE-2024-0001"], criticality: "critical", internetFacing: true }],
        },
        notes: ["private api key note should stay out"],
      },
      readyEnv(),
      async (url, init) => {
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        requests.push({ url, init, body });
        if (url.endsWith("/api/tags")) return jsonResponse({ models: [{ name: "qwen3:8b" }] });
        return jsonResponse({
          message: {
            content: JSON.stringify({
              executiveSummary: ["CVE evidence should be reviewed today."],
              priorityNotes: ["Use vuln_cve_2024_0001 with cisa_kev and first_epss before final claims."],
              cryptoNotes: [],
              complianceNotes: [],
              caveats: ["Model output is advisory."],
              citations: ["vuln_cve_2024_0001", "cisa_kev", "first_epss"],
            }),
          },
        });
      },
    );

    expect(requests.map((request) => request.url)).toEqual(["http://192.0.2.10:11434/api/tags", "http://192.0.2.10:11434/api/chat"]);
    const chatBody = requests[1].body;
    expect(chatBody).toEqual(
      expect.objectContaining({
        model: "qwen3:8b",
        stream: false,
        think: false,
        format: expect.objectContaining({ type: "object" }),
        keep_alive: "0",
        options: expect.objectContaining({ num_predict: 512, temperature: 0 }),
      }),
    );
    expect(requests[0].init?.signal).toBeInstanceOf(AbortSignal);
    expect(requests[1].init?.signal).toBeInstanceOf(AbortSignal);
    expect(result.localModel.requestOptions.tagsTimeoutMs).toBe(3000);
    expect(result.localModel.requestOptions.chatTimeoutMs).toBe(20000);
    expect(JSON.stringify(chatBody)).not.toContain("prod-api.internal");
    expect(JSON.stringify(chatBody)).not.toContain("private api key note");

    expect(result.localModel.status).toBe("completed");
    expect(result.localModel.modelCallsMade).toBe(1);
    expect(result.localModel.localGpuUsed).toBe(true);
    expect(result.localModel.calls.chatEndpointCalled).toBe(true);
    expect(result.localModel.calls.generateEndpointCalled).toBe(false);
    expect(result.localModel.output.executiveSummary[0]).toMatch(/reviewed today/i);
    expect(result.localModel.output.contentHash).toMatch(/^sha256:/);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("qwen3:8b");
    expect(serialized).not.toContain("192.0.2.10");
    expect(serialized).not.toContain("prod-api.internal");
    expect(serialized).not.toContain("private api key note");
  });

  test("blocks sensitive model output instead of echoing it", async () => {
    const result = await buildCyberOllamaModelPreview({ cves: ["CVE-2024-0001"] }, readyEnv(), async (url) => {
      if (url.endsWith("/api/tags")) return jsonResponse({ models: [{ name: "qwen3:8b" }] });
      return jsonResponse({ message: { content: JSON.stringify({ executiveSummary: ["Patch prod-api.internal now."] }) } });
    });

    expect(result.localModel.status).toBe("degraded_sensitive_model_output");
    expect(result.localModel.output.executiveSummary).toEqual([]);
    expect(result.localModel.output.contentHash).toMatch(/^sha256:/);
    expect(JSON.stringify(result)).not.toContain("prod-api.internal");
  });

  test("blocks concurrent local chat calls with a single-flight guard", async () => {
    let releaseChat!: () => void;
    let markChatStarted!: () => void;
    const chatRelease = new Promise<void>((resolve) => {
      releaseChat = resolve;
    });
    const chatStarted = new Promise<void>((resolve) => {
      markChatStarted = resolve;
    });
    const fetcher = async (url: string) => {
      if (url.endsWith("/api/tags")) return jsonResponse({ models: [{ name: "qwen3:8b" }] });
      markChatStarted();
      await chatRelease;
      return jsonResponse({
        message: {
          content: JSON.stringify({
            executiveSummary: ["Review deterministic evidence."],
            priorityNotes: [],
            cryptoNotes: [],
            complianceNotes: [],
            caveats: [],
            citations: ["vuln_cve_2024_0001"],
          }),
        },
      });
    };

    const first = buildCyberOllamaModelPreview({ cves: ["CVE-2024-0001"] }, readyEnv(), fetcher);
    await chatStarted;
    const second = await buildCyberOllamaModelPreview({ cves: ["CVE-2024-0001"] }, readyEnv(), fetcher);
    expect(second.localModel.status).toBe("blocked_concurrency_limit");
    expect(second.localModel.modelCallsMade).toBe(0);
    expect(second.localModel.calls.chatEndpointCalled).toBe(false);

    releaseChat();
    expect((await first).localModel.status).toBe("completed");
  });

  test("caps configured Ollama timeouts", async () => {
    const result = await buildCyberOllamaModelPreview(
      { cves: ["CVE-2024-0001"] },
      {
        ...readyEnv(),
        AOE_CYBER_MODEL_TAGS_TIMEOUT_MS: "1",
        AOE_CYBER_MODEL_CHAT_TIMEOUT_MS: "999999",
      },
      async (url) => {
        if (url.endsWith("/api/tags")) return jsonResponse({ models: [{ name: "missing" }] });
        throw new Error("chat should not be called");
      },
    );

    expect(result.localModel.requestOptions.tagsTimeoutMs).toBe(250);
    expect(result.localModel.requestOptions.chatTimeoutMs).toBe(60000);
    expect(result.localModel.status).toBe("blocked_model_not_installed");
  });

  test("enforces Ollama endpoint allow-list", () => {
    expect(buildAllowedOllamaEndpoint("http://192.0.2.10:11434", "/api/tags", "GET", false).toString()).toBe(
      "http://192.0.2.10:11434/api/tags",
    );
    expect(buildAllowedOllamaEndpoint("http://192.0.2.10:11434", "/api/chat", "POST", true).toString()).toBe(
      "http://192.0.2.10:11434/api/chat",
    );
    expect(() => buildAllowedOllamaEndpoint("ftp://192.0.2.10:11434", "/api/tags", "GET", false)).toThrow();
    expect(() => buildAllowedOllamaEndpoint("http://192.0.2.10:11434", "/api/generate", "POST", true)).toThrow();
    expect(() => buildAllowedOllamaEndpoint("http://192.0.2.10:11434", "/api/embeddings", "POST", true)).toThrow();
    expect(() => buildAllowedOllamaEndpoint("http://192.0.2.10:11434", "/api/pull", "POST", true)).toThrow();
    expect(() => buildAllowedOllamaEndpoint("http://192.0.2.10:11434", "/api/chat?x=1", "POST", true)).toThrow();
    expect(() => buildAllowedOllamaEndpoint("http://192.0.2.10:11434", "/api/chat", "GET", true)).toThrow();
    expect(() => buildAllowedOllamaEndpoint("http://192.0.2.10:11434", "/api/chat", "POST", false)).toThrow();
  });

  test("registers stream and route; app route requires payment before live env gates are evaluated", async () => {
    const stream = streams.find((row) => row.streamId === "cyber_ollama_model_preview");
    expect(stream?.route).toBe("/v1/streams/cyber-expert/windows-ollama/preview");
    expect(stream?.caveats.join(" ")).toMatch(/AOE_CYBER_MODEL_CHAT_ALLOWED=true/);

    const route = productRoutes.find((row) => row.routeId === "cyber_ollama_model_preview");
    expect(route).toEqual(
      expect.objectContaining({
        route: "/v1/streams/cyber-expert/windows-ollama/preview",
        method: "POST",
        schemaId: CYBER_OLLAMA_MODEL_PREVIEW_SCHEMA_ID,
        readiness: "key_required",
      }),
    );

    const restoreEnv = snapshotCyberModelEnv();
    try {
      const unpaid = await createApp().request("/v1/streams/cyber-expert/windows-ollama/preview", {
        method: "POST",
        body: JSON.stringify({ cves: ["CVE-2024-0001"] }),
        headers: { "Content-Type": "application/json" },
      });
      expect(unpaid.status).toBe(402);
      const unpaidBody = await unpaid.json();
      expect(unpaidBody.error).toBe("payment_required");
      expect(unpaid.headers.get("Payment-Required")).toBeTruthy();

      const quote = buildRoutePreviewQuote({
        routeId: "cyber_ollama_model_preview",
        productId: "cyber_expert_model_preview_pack",
        priceUsd: "1.0000",
        sourceIds: [
          "buyer_authorized_inventory",
          "cisa_kev",
          "nvd_cve",
          "first_epss",
          "osv",
          "crypto_incident_public_metadata",
          "trm_sanctions_docs",
          "ofac_sanctions_lists",
        ],
      });
      const res = await createApp().request("/v1/streams/cyber-expert/windows-ollama/preview", {
        method: "POST",
        body: JSON.stringify({ cves: ["CVE-2024-0001"] }),
        headers: { "Content-Type": "application/json", "X-AOE-Payment": expectedSimulatedPayment(quote.workOrderId) },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.readOnly).toBe(true);
      expect(body.sideEffects).toBe("local_model_inference_only");
      expect(body.report.localModel.status).toBe("blocked_by_provider_gate");
      expect(body.report.localModel.modelCallsMade).toBe(0);
    } finally {
      restoreEnv();
    }
  });
});

function readyEnv(): NodeJS.ProcessEnv {
  return {
    AOE_CYBER_MODEL_PROVIDER: "windows_ollama_capped_worker",
    AOE_CYBER_MODEL_PROVIDER_ENABLED: "true",
    AOE_CYBER_MODEL_EVAL_PASSED: "true",
    AOE_CYBER_MODEL_CHAT_ALLOWED: "true",
    AOE_WINDOWS_OLLAMA_URL: "http://192.0.2.10:11434",
    AOE_CYBER_MODEL_NAME: "qwen3:8b",
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function snapshotCyberModelEnv() {
  const keys = [
    "AOE_CYBER_MODEL_PROVIDER",
    "AOE_CYBER_MODEL_PROVIDER_ENABLED",
    "AOE_CYBER_MODEL_EVAL_PASSED",
    "AOE_CYBER_MODEL_EVAL_SUITE_HASH",
    "AOE_CYBER_MODEL_CHAT_ALLOWED",
    "AOE_CYBER_MODEL_NAME",
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
