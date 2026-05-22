import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { fetchCyberWindowsOllamaStatus, CYBER_WINDOWS_OLLAMA_STATUS_SCHEMA_ID } from "../src/adapters/cyber-windows-ollama.js";
import { productRoutes } from "../src/catalog.js";

describe("cyber Windows Ollama status", () => {
  test("fails closed when URL is not configured", async () => {
    const status = await fetchCyberWindowsOllamaStatus({}, async () => {
      throw new Error("fetch should not be called when not configured");
    });

    expect(status.schemaId).toBe(CYBER_WINDOWS_OLLAMA_STATUS_SCHEMA_ID);
    expect(status.configured).toBe(false);
    expect(status.status).toBe("not_configured");
    expect(status.endpointEchoed).toBe(false);
    expect(status.modelNamesEchoed).toBe(false);
    expect(status.calls.tagsEndpointCalled).toBe(false);
    expect(status.calls.chatEndpointCalled).toBe(false);
    expect(status.calls.generateEndpointCalled).toBe(false);
    expect(status.chatCallsAllowed).toBe(false);
  });

  test("calls /api/tags only and hashes model names", async () => {
    const requestedUrls: string[] = [];
    const status = await fetchCyberWindowsOllamaStatus(
      { AOE_WINDOWS_OLLAMA_URL: "http://192.0.2.10:11434" },
      async (url) => {
        requestedUrls.push(url);
        return new Response(JSON.stringify({ models: [{ name: "private-model:latest" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    );

    expect(requestedUrls).toEqual(["http://192.0.2.10:11434/api/tags"]);
    expect(status.configured).toBe(true);
    expect(status.status).toBe("reachable");
    expect(status.modelCount).toBe(1);
    expect(status.modelNameHashes[0]).toMatch(/^sha256:/);
    expect(JSON.stringify(status)).not.toContain("192.0.2.10");
    expect(JSON.stringify(status)).not.toContain("private-model");
    expect(status.calls.chatEndpointCalled).toBe(false);
    expect(status.calls.generateEndpointCalled).toBe(false);
  });

  test("registers public route without requiring configured Ollama", async () => {
    const route = productRoutes.find((row) => row.routeId === "cyber_windows_ollama_status");
    expect(route).toEqual(
      expect.objectContaining({
        route: "/v1/streams/cyber-expert/windows-ollama/status",
        method: "GET",
        schemaId: CYBER_WINDOWS_OLLAMA_STATUS_SCHEMA_ID,
        x402Stream: false,
      }),
    );

    const previous = process.env.AOE_WINDOWS_OLLAMA_URL;
    delete process.env.AOE_WINDOWS_OLLAMA_URL;
    try {
      const res = await createApp().request("/v1/streams/cyber-expert/windows-ollama/status");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.readOnly).toBe(true);
      expect(body.sideEffects).toBe("none");
      expect(body.report.schemaId).toBe(CYBER_WINDOWS_OLLAMA_STATUS_SCHEMA_ID);
      expect(body.report.status).toBe("not_configured");
    } finally {
      if (previous !== undefined) process.env.AOE_WINDOWS_OLLAMA_URL = previous;
    }
  });
});
