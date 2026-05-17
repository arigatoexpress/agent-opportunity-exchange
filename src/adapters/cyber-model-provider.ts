import { sha256 } from "../hash.js";

export type CyberModelProviderId =
  | "rules_only_no_model_call"
  | "windows_ollama_capped_worker"
  | "openai_supervised_summary_adapter"
  | "vertex_or_vllm_batch_eval";

export interface CyberModelProviderResolution {
  provider: CyberModelProviderId;
  requestedProvider: CyberModelProviderId;
  status:
    | "active_rules_only"
    | "ready_windows_ollama_capped_worker"
    | "blocked_requires_eval_pass"
    | "blocked_requires_eval_hash"
    | "blocked_requires_explicit_enable"
    | "blocked_requires_chat_allowlist"
    | "blocked_missing_provider_config"
    | "blocked_adapter_not_implemented";
  modelCallsMade: number;
  localGpuUsed: boolean;
  paidApiUsed: boolean;
  futureProviderSlots: Exclude<CyberModelProviderId, "rules_only_no_model_call">[];
  gate: {
    explicitEnableRequired: true;
    evalPassRequired: true;
    chatAllowlistRequired: boolean;
    evalHashRequired: boolean;
    evalPassAcknowledged: boolean;
    evalHashAcknowledged: boolean;
    currentEvalSuiteHash: string | null;
    chatAllowlistAcknowledged: boolean;
    configPresent: boolean;
    modelNameHash: string | null;
    reason: string;
  };
}

const FUTURE_PROVIDER_SLOTS: CyberModelProviderResolution["futureProviderSlots"] = [
  "windows_ollama_capped_worker",
  "openai_supervised_summary_adapter",
  "vertex_or_vllm_batch_eval",
];

export function resolveCyberModelProvider(env: NodeJS.ProcessEnv = process.env, currentEvalSuiteHash?: string): CyberModelProviderResolution {
  const requestedProvider = normalizeProvider(env.AOE_CYBER_MODEL_PROVIDER);
  if (requestedProvider === "rules_only_no_model_call") {
    return resolution({
      activeProvider: "rules_only_no_model_call",
      requestedProvider,
      status: "active_rules_only",
      evalPassAcknowledged: true,
      evalHashAcknowledged: false,
      currentEvalSuiteHash: currentEvalSuiteHash ?? null,
      chatAllowlistAcknowledged: false,
      configPresent: true,
      modelNameHash: null,
      reason: "Rules-only provider is active; no model calls are made.",
    });
  }

  const explicitlyEnabled = env.AOE_CYBER_MODEL_PROVIDER_ENABLED === "true";
  const evalHashRequired = Boolean(currentEvalSuiteHash);
  const evalHashAcknowledged = Boolean(currentEvalSuiteHash && env.AOE_CYBER_MODEL_EVAL_SUITE_HASH === currentEvalSuiteHash);
  const evalPassAcknowledged = evalHashRequired ? evalHashAcknowledged : env.AOE_CYBER_MODEL_EVAL_PASSED === "true";
  const configPresent = providerConfigPresent(requestedProvider, env);
  const chatAllowlistAcknowledged = env.AOE_CYBER_MODEL_CHAT_ALLOWED === "true";
  const modelNameHash = requestedProvider === "windows_ollama_capped_worker" && env.AOE_CYBER_MODEL_NAME ? redactedHash(env.AOE_CYBER_MODEL_NAME) : null;

  if (!explicitlyEnabled) {
    return resolution({
      activeProvider: "rules_only_no_model_call",
      requestedProvider,
      status: "blocked_requires_explicit_enable",
      evalPassAcknowledged,
      evalHashAcknowledged,
      currentEvalSuiteHash: currentEvalSuiteHash ?? null,
      chatAllowlistAcknowledged,
      configPresent,
      modelNameHash,
      reason: "Future model providers require AOE_CYBER_MODEL_PROVIDER_ENABLED=true.",
    });
  }

  if (!evalPassAcknowledged) {
    return resolution({
      activeProvider: "rules_only_no_model_call",
      requestedProvider,
      status: evalHashRequired ? "blocked_requires_eval_hash" : "blocked_requires_eval_pass",
      evalPassAcknowledged: false,
      evalHashAcknowledged,
      currentEvalSuiteHash: currentEvalSuiteHash ?? null,
      chatAllowlistAcknowledged,
      configPresent,
      modelNameHash,
      reason: evalHashRequired
        ? "Future model providers require AOE_CYBER_MODEL_EVAL_SUITE_HASH to match the current deterministic eval suite hash."
        : "Future model providers require AOE_CYBER_MODEL_EVAL_PASSED=true after local eval verification.",
    });
  }

  if (!configPresent) {
    return resolution({
      activeProvider: "rules_only_no_model_call",
      requestedProvider,
      status: "blocked_missing_provider_config",
      evalPassAcknowledged: true,
      evalHashAcknowledged,
      currentEvalSuiteHash: currentEvalSuiteHash ?? null,
      chatAllowlistAcknowledged,
      configPresent: false,
      modelNameHash,
      reason: providerConfigReason(requestedProvider),
    });
  }

  if (requestedProvider === "windows_ollama_capped_worker" && !chatAllowlistAcknowledged) {
    return resolution({
      activeProvider: "rules_only_no_model_call",
      requestedProvider,
      status: "blocked_requires_chat_allowlist",
      evalPassAcknowledged: true,
      evalHashAcknowledged,
      currentEvalSuiteHash: currentEvalSuiteHash ?? null,
      chatAllowlistAcknowledged: false,
      configPresent: true,
      modelNameHash,
      reason: "Windows/Ollama chat calls require AOE_CYBER_MODEL_CHAT_ALLOWED=true in addition to provider and eval gates.",
    });
  }

  if (requestedProvider === "windows_ollama_capped_worker") {
    return resolution({
      activeProvider: "windows_ollama_capped_worker",
      requestedProvider,
      status: "ready_windows_ollama_capped_worker",
      evalPassAcknowledged: true,
      evalHashAcknowledged,
      currentEvalSuiteHash: currentEvalSuiteHash ?? null,
      chatAllowlistAcknowledged: true,
      configPresent: true,
      modelNameHash,
      reason: "Windows/Ollama provider is gate-ready; the adapter still verifies /api/tags and caps each /api/chat request.",
    });
  }

  return resolution({
    activeProvider: "rules_only_no_model_call",
    requestedProvider,
    status: "blocked_adapter_not_implemented",
    evalPassAcknowledged: true,
    evalHashAcknowledged,
    currentEvalSuiteHash: currentEvalSuiteHash ?? null,
    chatAllowlistAcknowledged,
    configPresent: true,
    modelNameHash,
    reason: "Provider config is present, but live provider calls are still blocked until the provider adapter is implemented and separately reviewed.",
  });
}

function normalizeProvider(value: string | undefined): CyberModelProviderId {
  if (
    value === "windows_ollama_capped_worker" ||
    value === "openai_supervised_summary_adapter" ||
    value === "vertex_or_vllm_batch_eval"
  ) {
    return value;
  }
  return "rules_only_no_model_call";
}

function providerConfigPresent(provider: CyberModelProviderId, env: NodeJS.ProcessEnv): boolean {
  if (provider === "rules_only_no_model_call") return true;
  if (provider === "windows_ollama_capped_worker") return Boolean(env.AOE_WINDOWS_OLLAMA_URL && env.AOE_CYBER_MODEL_NAME);
  if (provider === "openai_supervised_summary_adapter") return Boolean(env.OPENAI_API_KEY);
  if (provider === "vertex_or_vllm_batch_eval") return Boolean(env.GOOGLE_CLOUD_PROJECT || env.VLLM_BASE_URL);
  return false;
}

function providerConfigReason(provider: CyberModelProviderId): string {
  if (provider === "windows_ollama_capped_worker") return "Windows/Ollama provider requires AOE_WINDOWS_OLLAMA_URL and AOE_CYBER_MODEL_NAME.";
  if (provider === "openai_supervised_summary_adapter") return "OpenAI provider requires OPENAI_API_KEY and a reviewed fine-tuning/inference plan.";
  if (provider === "vertex_or_vllm_batch_eval") return "Vertex/vLLM provider requires GOOGLE_CLOUD_PROJECT or VLLM_BASE_URL.";
  return "Rules-only provider requires no external config.";
}

function resolution(input: {
  activeProvider: CyberModelProviderId;
  requestedProvider: CyberModelProviderId;
  status: CyberModelProviderResolution["status"];
  evalPassAcknowledged: boolean;
  evalHashAcknowledged: boolean;
  currentEvalSuiteHash: string | null;
  chatAllowlistAcknowledged: boolean;
  configPresent: boolean;
  modelNameHash: string | null;
  reason: string;
}): CyberModelProviderResolution {
  return {
    provider: input.activeProvider,
    requestedProvider: input.requestedProvider,
    status: input.status,
    modelCallsMade: 0,
    localGpuUsed: false,
    paidApiUsed: false,
    futureProviderSlots: FUTURE_PROVIDER_SLOTS,
    gate: {
      explicitEnableRequired: true,
      evalPassRequired: true,
      chatAllowlistRequired: input.requestedProvider === "windows_ollama_capped_worker",
      evalHashRequired: Boolean(input.currentEvalSuiteHash),
      evalPassAcknowledged: input.evalPassAcknowledged,
      evalHashAcknowledged: input.evalHashAcknowledged,
      currentEvalSuiteHash: input.currentEvalSuiteHash,
      chatAllowlistAcknowledged: input.chatAllowlistAcknowledged,
      configPresent: input.configPresent,
      modelNameHash: input.modelNameHash,
      reason: input.reason,
    },
  };
}

function redactedHash(value: string): string {
  return sha256({ modelName: value });
}
