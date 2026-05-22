import { sha256 } from "../hash.js";

export const CYBER_WINDOWS_OLLAMA_STATUS_SCHEMA_ID = "aoe.cyber_windows_ollama_status.v1";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface CyberWindowsOllamaStatus {
  schemaId: typeof CYBER_WINDOWS_OLLAMA_STATUS_SCHEMA_ID;
  generatedAt: string;
  mode: "read_only_windows_ollama_status";
  configured: boolean;
  status: "not_configured" | "reachable" | "degraded";
  endpointEchoed: false;
  endpointHash: string | null;
  modelNamesEchoed: false;
  modelCount: number;
  modelNameHashes: string[];
  calls: {
    tagsEndpointCalled: boolean;
    chatEndpointCalled: false;
    generateEndpointCalled: false;
    embeddingsEndpointCalled: false;
  };
  chatCallsAllowed: false;
  localGpuUsed: false;
  paidApiUsed: false;
  timeoutMs: number;
  error: string | null;
  caveats: string[];
}

export async function fetchCyberWindowsOllamaStatus(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: FetchLike = fetch,
): Promise<CyberWindowsOllamaStatus> {
  const baseUrl = env.AOE_WINDOWS_OLLAMA_URL?.trim();
  const timeoutMs = parseTimeout(env.AOE_WINDOWS_OLLAMA_TIMEOUT_MS);
  if (!baseUrl) {
    return baseStatus({
      configured: false,
      status: "not_configured",
      endpointHash: null,
      modelCount: 0,
      modelNameHashes: [],
      tagsEndpointCalled: false,
      timeoutMs,
      error: "AOE_WINDOWS_OLLAMA_URL is not configured.",
    });
  }

  let tagsUrl: URL;
  try {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Only http or https Ollama URLs are allowed.");
    }
    tagsUrl = new URL("/api/tags", parsed);
  } catch (error) {
    return baseStatus({
      configured: true,
      status: "degraded",
      endpointHash: sha256({ baseUrl }),
      modelCount: 0,
      modelNameHashes: [],
      tagsEndpointCalled: false,
      timeoutMs,
      error: error instanceof Error ? error.message : "Invalid AOE_WINDOWS_OLLAMA_URL.",
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(tagsUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "agent-opportunity-exchange/0.1 read-only ollama status",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Ollama tags request failed: ${response.status}`);
    }
    const body = (await response.json()) as { models?: Array<{ name?: string; model?: string }> };
    const modelNames = (body.models ?? []).map((model) => model.name ?? model.model).filter((name): name is string => Boolean(name));
    return baseStatus({
      configured: true,
      status: "reachable",
      endpointHash: sha256({ origin: tagsUrl.origin }),
      modelCount: modelNames.length,
      modelNameHashes: modelNames.map((name) => sha256({ modelName: name })).sort(),
      tagsEndpointCalled: true,
      timeoutMs,
      error: null,
    });
  } catch (error) {
    return baseStatus({
      configured: true,
      status: "degraded",
      endpointHash: sha256({ origin: tagsUrl.origin }),
      modelCount: 0,
      modelNameHashes: [],
      tagsEndpointCalled: true,
      timeoutMs,
      error: error instanceof Error ? error.message : "Unknown Ollama status error.",
    });
  } finally {
    clearTimeout(timer);
  }
}

function baseStatus(input: {
  configured: boolean;
  status: CyberWindowsOllamaStatus["status"];
  endpointHash: string | null;
  modelCount: number;
  modelNameHashes: string[];
  tagsEndpointCalled: boolean;
  timeoutMs: number;
  error: string | null;
}): CyberWindowsOllamaStatus {
  return {
    schemaId: CYBER_WINDOWS_OLLAMA_STATUS_SCHEMA_ID,
    generatedAt: new Date().toISOString(),
    mode: "read_only_windows_ollama_status",
    configured: input.configured,
    status: input.status,
    endpointEchoed: false,
    endpointHash: input.endpointHash,
    modelNamesEchoed: false,
    modelCount: input.modelCount,
    modelNameHashes: input.modelNameHashes,
    calls: {
      tagsEndpointCalled: input.tagsEndpointCalled,
      chatEndpointCalled: false,
      generateEndpointCalled: false,
      embeddingsEndpointCalled: false,
    },
    chatCallsAllowed: false,
    localGpuUsed: false,
    paidApiUsed: false,
    timeoutMs: input.timeoutMs,
    error: input.error,
    caveats: [
      "Status route calls /api/tags only.",
      "No /api/chat, /api/generate, or embeddings calls are made.",
      "Endpoint URL and model names are hashed instead of echoed.",
      "A reachable Ollama daemon does not imply a model is approved for cyber use.",
    ],
  };
}

function parseTimeout(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isFinite(parsed)) return Math.min(Math.max(parsed, 250), 5_000);
  return 1_500;
}
