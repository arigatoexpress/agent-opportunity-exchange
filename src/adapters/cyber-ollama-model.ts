import {
  buildCyberExpertModelPreview,
  CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID,
  type CyberExpertModelPreview,
} from "./cyber-model-preview.js";
import { resolveCyberModelProvider, type CyberModelProviderResolution } from "./cyber-model-provider.js";
import type { CyberExpertCaseStoreRequest, RagDocument } from "./cyber-case-store.js";
import { sha256 } from "../hash.js";

export const CYBER_OLLAMA_MODEL_PREVIEW_SCHEMA_ID = "aoe.cyber_ollama_model_preview.v1";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
type OllamaApiPath = "/api/tags" | "/api/chat";

export interface CyberOllamaModelPreview {
  schemaId: typeof CYBER_OLLAMA_MODEL_PREVIEW_SCHEMA_ID;
  generatedAt: string;
  mode: "gated_windows_ollama_model_preview";
  deterministicSchemaId: typeof CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID;
  x402Stream: true;
  productId: "cyber_expert_model_preview_pack";
  modelRuntime: CyberModelProviderResolution;
  deterministicPreview: CyberExpertModelPreview;
  localModel: {
    status:
      | "blocked_by_provider_gate"
      | "blocked_invalid_ollama_url"
      | "blocked_model_not_installed"
      | "blocked_concurrency_limit"
      | "degraded_tags_request_failed"
      | "degraded_chat_request_failed"
      | "degraded_unparseable_model_output"
      | "degraded_sensitive_model_output"
      | "completed";
    endpointEchoed: false;
    endpointHash: string | null;
    modelNameEchoed: false;
    modelNameHash: string | null;
    rawPromptEchoed: false;
    rawOutputEchoed: false;
    modelCallsMade: number;
    localGpuUsed: boolean;
    paidApiUsed: false;
    requestOptions: {
      stream: false;
      keepAlive: string;
      numPredict: number;
      tagsTimeoutMs: number;
      chatTimeoutMs: number;
      temperature: 0;
      think: false;
      format: "json_schema";
    };
    calls: {
      tagsEndpointCalled: boolean;
      chatEndpointCalled: boolean;
      generateEndpointCalled: false;
      embeddingsEndpointCalled: false;
      pullEndpointCalled: false;
      deleteEndpointCalled: false;
      createEndpointCalled: false;
      copyEndpointCalled: false;
      showEndpointCalled: false;
      psEndpointCalled: false;
    };
    output: {
      contentHash: string | null;
      executiveSummary: string[];
      priorityNotes: string[];
      cryptoNotes: string[];
      complianceNotes: string[];
      caveats: string[];
      citations: string[];
    };
    errorCode: string | null;
  };
  safety: {
    readOnly: true;
    sideEffects: "local_model_inference_only";
    activeScanningAllowed: false;
    exploitPayloadGenerationAllowed: false;
    liveSettlementAllowed: false;
    modelOutputAuthoritative: false;
    outputPolicy: string[];
  };
  evidenceProof: {
    algorithm: "sha256";
    canonicalization: "stable-json-sorted-keys-v1";
    previewHash: string;
    deterministicPreviewHash: string;
  };
}

interface OllamaTagsResponse {
  models?: Array<{ name?: string; model?: string }>;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
  response?: string;
}

let ollamaChatInFlight = false;

export async function buildCyberOllamaModelPreview(
  request: CyberExpertCaseStoreRequest = {},
  env: NodeJS.ProcessEnv = process.env,
  fetcher: FetchLike = fetch,
  currentEvalSuiteHash?: string,
): Promise<CyberOllamaModelPreview> {
  const deterministicPreview = buildCyberExpertModelPreview(request, resolveCyberModelProvider({}));
  const provider = resolveCyberModelProvider(env, currentEvalSuiteHash);
  const modelName = env.AOE_CYBER_MODEL_NAME?.trim() ?? "";
  const requestOptions = {
    stream: false as const,
    keepAlive: parseKeepAlive(env.AOE_CYBER_MODEL_KEEP_ALIVE),
    numPredict: parseNumPredict(env.AOE_CYBER_MODEL_NUM_PREDICT),
    tagsTimeoutMs: parseTimeoutMs(env.AOE_CYBER_MODEL_TAGS_TIMEOUT_MS, 3_000, 250, 10_000),
    chatTimeoutMs: parseTimeoutMs(env.AOE_CYBER_MODEL_CHAT_TIMEOUT_MS, 20_000, 1_000, 60_000),
    temperature: 0 as const,
    think: false as const,
    format: "json_schema" as const,
  };

  if (provider.status !== "ready_windows_ollama_capped_worker" || provider.provider !== "windows_ollama_capped_worker") {
    return finalize({
      deterministicPreview,
      provider,
      localModel: baseLocalModel({
        status: "blocked_by_provider_gate",
        endpointHash: null,
        modelNameHash: provider.gate.modelNameHash,
        requestOptions,
        errorCode: "provider_gate_not_ready",
      }),
    });
  }

  let endpoint: URL;
  try {
    endpoint = buildAllowedOllamaEndpoint(env.AOE_WINDOWS_OLLAMA_URL ?? "", "/api/tags", "GET", false);
  } catch {
    return finalize({
      deterministicPreview,
      provider,
      localModel: baseLocalModel({
        status: "blocked_invalid_ollama_url",
        endpointHash: env.AOE_WINDOWS_OLLAMA_URL ? sha256({ ollamaEndpoint: env.AOE_WINDOWS_OLLAMA_URL }) : null,
        modelNameHash: provider.gate.modelNameHash,
        requestOptions,
        errorCode: "invalid_ollama_url",
      }),
    });
  }

  const endpointHash = sha256({ origin: endpoint.origin });
  let models: string[];
  try {
    const response = await fetchOllamaWithTimeout(endpoint.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "agent-opportunity-exchange/0.1 gated ollama model preview",
      },
    }, fetcher, requestOptions.tagsTimeoutMs);
    if (!response.ok) throw new Error("tags_failed");
    const body = (await response.json()) as OllamaTagsResponse;
    models = (body.models ?? []).map((model) => model.name ?? model.model).filter((name): name is string => Boolean(name));
  } catch {
    return finalize({
      deterministicPreview,
      provider,
      localModel: baseLocalModel({
        status: "degraded_tags_request_failed",
        endpointHash,
        modelNameHash: provider.gate.modelNameHash,
        requestOptions,
        tagsEndpointCalled: true,
        errorCode: "ollama_tags_failed",
      }),
    });
  }

  if (!models.includes(modelName)) {
    return finalize({
      deterministicPreview,
      provider,
      localModel: baseLocalModel({
        status: "blocked_model_not_installed",
        endpointHash,
        modelNameHash: provider.gate.modelNameHash,
        requestOptions,
        tagsEndpointCalled: true,
        errorCode: "configured_model_not_installed",
      }),
    });
  }

  const chatUrl = buildAllowedOllamaEndpoint(env.AOE_WINDOWS_OLLAMA_URL ?? "", "/api/chat", "POST", true);
  const releaseChatSlot = acquireOllamaChatSlot();
  if (!releaseChatSlot) {
    return finalize({
      deterministicPreview,
      provider,
      localModel: baseLocalModel({
        status: "blocked_concurrency_limit",
        endpointHash,
        modelNameHash: provider.gate.modelNameHash,
        requestOptions,
        tagsEndpointCalled: true,
        errorCode: "ollama_chat_concurrency_limit",
      }),
    });
  }

  let content = "";
  try {
    const response = await fetchOllamaWithTimeout(chatUrl.toString(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "agent-opportunity-exchange/0.1 gated ollama model preview",
      },
      body: JSON.stringify({
        model: modelName,
        stream: false,
        think: false,
        format: OLLAMA_RESPONSE_FORMAT,
        keep_alive: requestOptions.keepAlive,
        options: {
          num_predict: requestOptions.numPredict,
          temperature: requestOptions.temperature,
        },
        messages: [
          {
            role: "system",
            content:
              "You are a defensive cybersecurity summarizer. Return only a short JSON object matching the supplied schema. Use only the supplied evidence; do not invent CVE details, exploitability, affected products, losses, or legal conclusions. Each array may contain 0-2 short strings under 90 characters. Do not include hidden reasoning, markdown, exploit steps, hostnames, wallet addresses, emails, IPs, secrets, URLs with query tokens, or raw vendor payloads.",
          },
          {
            role: "user",
            content: buildModelPrompt(deterministicPreview),
          },
        ],
      }),
    }, fetcher, requestOptions.chatTimeoutMs);
    if (!response.ok) throw new Error("chat_failed");
    const body = (await response.json()) as OllamaChatResponse;
    content = String(body.message?.content ?? body.response ?? "");
  } catch {
    return finalize({
      deterministicPreview,
      provider: providerAfterCall(provider, true),
      localModel: baseLocalModel({
        status: "degraded_chat_request_failed",
        endpointHash,
        modelNameHash: provider.gate.modelNameHash,
        requestOptions,
        tagsEndpointCalled: true,
        chatEndpointCalled: true,
        modelCallsMade: 1,
        localGpuUsed: true,
        errorCode: "ollama_chat_failed",
      }),
    });
  } finally {
    releaseChatSlot();
  }

  if (containsSensitiveOutput(content)) {
    return finalize({
      deterministicPreview,
      provider: providerAfterCall(provider, true),
      localModel: baseLocalModel({
        status: "degraded_sensitive_model_output",
        endpointHash,
        modelNameHash: provider.gate.modelNameHash,
        requestOptions,
        tagsEndpointCalled: true,
        chatEndpointCalled: true,
        modelCallsMade: 1,
        localGpuUsed: true,
        contentHash: sha256({ modelOutput: content }),
        errorCode: "sensitive_output_blocked",
      }),
    });
  }

  const parsed = parseModelOutput(content);
  if (!parsed) {
    return finalize({
      deterministicPreview,
      provider: providerAfterCall(provider, true),
      localModel: baseLocalModel({
        status: "degraded_unparseable_model_output",
        endpointHash,
        modelNameHash: provider.gate.modelNameHash,
        requestOptions,
        tagsEndpointCalled: true,
        chatEndpointCalled: true,
        modelCallsMade: 1,
        localGpuUsed: true,
        contentHash: sha256({ modelOutput: content }),
        errorCode: "unparseable_model_output",
      }),
    });
  }

  return finalize({
    deterministicPreview,
    provider: providerAfterCall(provider, true),
    localModel: baseLocalModel({
      status: "completed",
      endpointHash,
      modelNameHash: provider.gate.modelNameHash,
      requestOptions,
      tagsEndpointCalled: true,
      chatEndpointCalled: true,
      modelCallsMade: 1,
      localGpuUsed: true,
      contentHash: sha256({ modelOutput: content }),
      output: parsed,
      errorCode: null,
    }),
  });
}

export function buildAllowedOllamaEndpoint(baseUrl: string, path: string, method: string, allowChat: boolean): URL {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https Ollama URLs are allowed.");
  }
  if (path !== "/api/tags" && path !== "/api/chat") {
    throw new Error("Ollama endpoint is not allow-listed.");
  }
  if (path === "/api/tags" && method !== "GET") {
    throw new Error("Ollama tags endpoint must use GET.");
  }
  if (path === "/api/chat" && (!allowChat || method !== "POST")) {
    throw new Error("Ollama chat endpoint is not enabled for this request.");
  }
  const allowedPath = path as OllamaApiPath;
  const url = new URL(allowedPath, parsed);
  if (url.search || url.hash || url.pathname !== path) {
    throw new Error("Ollama endpoint path must not include query or fragment.");
  }
  return url;
}

async function fetchOllamaWithTimeout(url: string, init: RequestInit, fetcher: FetchLike, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function acquireOllamaChatSlot(): (() => void) | null {
  if (ollamaChatInFlight) return null;
  ollamaChatInFlight = true;
  return () => {
    ollamaChatInFlight = false;
  };
}

function finalize(input: {
  deterministicPreview: CyberExpertModelPreview;
  provider: CyberModelProviderResolution;
  localModel: CyberOllamaModelPreview["localModel"];
}): CyberOllamaModelPreview {
  const withoutProof = {
    schemaId: CYBER_OLLAMA_MODEL_PREVIEW_SCHEMA_ID as typeof CYBER_OLLAMA_MODEL_PREVIEW_SCHEMA_ID,
    generatedAt: new Date().toISOString(),
    mode: "gated_windows_ollama_model_preview" as const,
    deterministicSchemaId: CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID as typeof CYBER_EXPERT_MODEL_PREVIEW_SCHEMA_ID,
    x402Stream: true as const,
    productId: "cyber_expert_model_preview_pack" as const,
    modelRuntime: input.provider,
    deterministicPreview: input.deterministicPreview,
    localModel: input.localModel,
    safety: {
      readOnly: true as const,
      sideEffects: "local_model_inference_only" as const,
      activeScanningAllowed: false as const,
      exploitPayloadGenerationAllowed: false as const,
      liveSettlementAllowed: false as const,
      modelOutputAuthoritative: false as const,
      outputPolicy: [
        "This route can call a local Windows/Ollama /api/chat endpoint only after explicit env gates are set.",
        "The deterministic preview remains the source-of-truth contract; model text is advisory and non-authoritative.",
        "Raw prompts, raw model output, endpoint URLs, model names, private hostnames, wallets, emails, IPs, and secrets are not echoed.",
        "No /api/generate, embeddings, pull, delete, create, copy, show, ps, external scanning, exploit payloads, wallet signing, or money movement.",
      ],
    },
  };

  return {
    ...withoutProof,
    evidenceProof: {
      algorithm: "sha256",
      canonicalization: "stable-json-sorted-keys-v1",
      previewHash: sha256(withoutProof),
      deterministicPreviewHash: input.deterministicPreview.evidenceProof.previewHash,
    },
  };
}

function baseLocalModel(input: {
  status: CyberOllamaModelPreview["localModel"]["status"];
  endpointHash: string | null;
  modelNameHash: string | null;
  requestOptions: CyberOllamaModelPreview["localModel"]["requestOptions"];
  tagsEndpointCalled?: boolean;
  chatEndpointCalled?: boolean;
  modelCallsMade?: number;
  localGpuUsed?: boolean;
  contentHash?: string | null;
  output?: CyberOllamaModelPreview["localModel"]["output"];
  errorCode: string | null;
}): CyberOllamaModelPreview["localModel"] {
  return {
    status: input.status,
    endpointEchoed: false,
    endpointHash: input.endpointHash,
    modelNameEchoed: false,
    modelNameHash: input.modelNameHash,
    rawPromptEchoed: false,
    rawOutputEchoed: false,
    modelCallsMade: input.modelCallsMade ?? 0,
    localGpuUsed: input.localGpuUsed ?? false,
    paidApiUsed: false,
    requestOptions: input.requestOptions,
    calls: {
      tagsEndpointCalled: input.tagsEndpointCalled ?? false,
      chatEndpointCalled: input.chatEndpointCalled ?? false,
      generateEndpointCalled: false,
      embeddingsEndpointCalled: false,
      pullEndpointCalled: false,
      deleteEndpointCalled: false,
      createEndpointCalled: false,
      copyEndpointCalled: false,
      showEndpointCalled: false,
      psEndpointCalled: false,
    },
    output: input.output ?? {
      contentHash: input.contentHash ?? null,
      executiveSummary: [],
      priorityNotes: [],
      cryptoNotes: [],
      complianceNotes: [],
      caveats: [],
      citations: [],
    },
    errorCode: input.errorCode,
  };
}

function providerAfterCall(provider: CyberModelProviderResolution, localGpuUsed: boolean): CyberModelProviderResolution {
  return {
    ...provider,
    modelCallsMade: provider.modelCallsMade + 1,
    localGpuUsed,
    paidApiUsed: false,
  };
}

function buildModelPrompt(preview: CyberExpertModelPreview): string {
  const payload = {
    case: preview.case,
    executiveSummary: preview.executiveSummary,
    priorityQueue: preview.priorityQueue,
    cryptoExploitNotes: preview.cryptoExploitNotes,
    complianceProofNotes: preview.complianceProofNotes,
    sourceCoverage: preview.sourceCoverage,
    ragDocuments: preview.caseStore.ragDocuments.slice(0, 8).map(promptDocument),
    blockedActions: preview.blockedActions,
    requiredJsonShape: {
      executiveSummary: ["0-2 short defensive summary bullets; no invented CVE facts"],
      priorityNotes: ["0-2 remediation notes with evidenceIds/sourceIds"],
      cryptoNotes: ["0-2 defensive crypto incident mapping notes"],
      complianceNotes: ["0-2 compliance proof caveats"],
      caveats: ["0-2 freshness/safety caveats"],
      citations: ["evidenceIds and sourceIds only"],
    },
  };
  return redactSensitiveText(JSON.stringify(payload));
}

function promptDocument(document: RagDocument) {
  return {
    docId: document.docId,
    title: redactSensitiveText(document.title),
    sourceIds: document.sourceIds,
    ttlSeconds: document.ttlSeconds,
    body: redactSensitiveText(document.body).slice(0, 900),
    metadata: document.metadata,
  };
}

function parseModelOutput(content: string): CyberOllamaModelPreview["localModel"]["output"] | null {
  const withoutThink = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const firstBrace = withoutThink.indexOf("{");
  const lastBrace = withoutThink.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  try {
    const parsed = JSON.parse(withoutThink.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
    return {
      contentHash: sha256({ modelOutput: content }),
      executiveSummary: stringArray(parsed.executiveSummary ?? parsed.executive_summary, 3, 240),
      priorityNotes: stringArray(parsed.priorityNotes ?? parsed.priority_notes, 5, 240),
      cryptoNotes: stringArray(parsed.cryptoNotes ?? parsed.crypto_notes, 5, 240),
      complianceNotes: stringArray(parsed.complianceNotes ?? parsed.compliance_notes, 5, 240),
      caveats: stringArray(parsed.caveats, 5, 220),
      citations: stringArray(parsed.citations, 20, 80),
    };
  } catch {
    return null;
  }
}

function stringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => redactSensitiveText(item).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => (item.length > maxLength ? `${item.slice(0, maxLength - 3)}...` : item));
}

function containsSensitiveOutput(value: string): boolean {
  return SENSITIVE_OUTPUT_PATTERNS.some((pattern) => pattern.test(value));
}

function redactSensitiveText(value: string): string {
  return value
    .replace(/\b0x[a-fA-F0-9]{40}\b/g, "[redacted_wallet]")
    .replace(/\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[0-1]))\.\d{1,3}\.\d{1,3}\b/g, "[redacted_private_ip]")
    .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, "[redacted_email]")
    .replace(/\b[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.(?:internal|lan|local|corp|home)\b/gi, "[redacted_private_host]")
    .replace(/https?:\/\/\S+[?&]\S*(?:api[_-]?key|token|sig|signature|password|secret)=\S*/gi, "[redacted_url_token]");
}

const SENSITIVE_OUTPUT_PATTERNS = [
  /\b0x[a-fA-F0-9]{40}\b/,
  /\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[0-1]))\.\d{1,3}\.\d{1,3}\b/,
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
  /\b[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.(?:internal|lan|local|corp|home)\b/i,
  /https?:\/\/\S+[?&]\S*(?:api[_-]?key|token|sig|signature|password|secret)=/i,
  /\b(?:api[_-]?key|private[_-]?key|password|secret|token)\s*[:=]/i,
  /\/api\/(?:generate|embeddings|pull|delete|create|copy|show|ps)\b/i,
];

const OLLAMA_RESPONSE_FORMAT = {
  type: "object",
  properties: {
    executiveSummary: { type: "array", maxItems: 2, items: { type: "string", maxLength: 90 } },
    priorityNotes: { type: "array", maxItems: 2, items: { type: "string", maxLength: 90 } },
    cryptoNotes: { type: "array", maxItems: 2, items: { type: "string", maxLength: 90 } },
    complianceNotes: { type: "array", maxItems: 2, items: { type: "string", maxLength: 90 } },
    caveats: { type: "array", maxItems: 2, items: { type: "string", maxLength: 90 } },
    citations: { type: "array", maxItems: 12, items: { type: "string", maxLength: 80 } },
  },
  required: ["executiveSummary", "priorityNotes", "cryptoNotes", "complianceNotes", "caveats", "citations"],
  additionalProperties: false,
} as const;

function parseNumPredict(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return 512;
  return Math.min(Math.max(parsed, 64), 1_024);
}

function parseKeepAlive(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return "0";
  if (/^(0|[1-9]\d{0,2}(ms|s|m)?)$/.test(trimmed)) return trimmed;
  return "0";
}

function parseTimeoutMs(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
