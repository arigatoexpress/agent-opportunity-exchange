type ProbeStatus = "pass" | "fail";

interface ProbeResult {
  name: string;
  method: "GET" | "POST";
  path: string;
  status: ProbeStatus;
  httpStatus: number | null;
  durationMs: number;
  error: string | null;
}

const baseUrl = normalizeBaseUrl(process.env.AOE_BASE_URL ?? process.env.AOE_GCP_BASE_URL ?? "");

if (!baseUrl) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: "missing_AOE_BASE_URL",
        usage: "AOE_BASE_URL=https://<cloud-run-or-local-base-url> npm run gcp:smoke",
        liveSettlementAllowed: false,
        externalSideEffectsAllowed: false,
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

const probes = [
  getProbe("health", "/health", (body) => body.ok === true && body.liveSettlementAllowed === false),
  getProbe("readiness", "/v1/readiness", (body) => body.schemaId === "aoe.readiness.v1" && body.liveSettlementAllowed === false),
  getProbe("routes", "/v1/routes", (body) => body.schemaId === "aoe.discovery.routes.v1" && Array.isArray(body.routes)),
  getProbe("contracts", "/v1/contracts", (body) => body.schemaId === "aoe.contract_bundle.v1"),
  getProbe(
    "cyber_provider_status",
    "/v1/streams/cyber-expert/provider-status",
    (body) => body.readOnly === true && body.modelCallsMade === 0 && body.localGpuUsed === false,
  ),
  getProbe(
    "cyber_evals",
    "/v1/streams/cyber-expert/evals",
    (body) => body.readOnly === true && body.report?.evidenceProof?.evalSuiteHash,
  ),
  getProbe(
    "zero_g_proof_readiness",
    "/v1/hackathon/0g-proof",
    (body) =>
      body.readOnly === true &&
      body.sideEffects === "public_chain_receipt_fetch_only" &&
      body.report?.schemaId === "aoe.zero_g_proof_readiness.v1" &&
      body.report?.safety?.walletSigningAllowed === false &&
      body.report?.safety?.transactionBroadcastAllowed === false,
  ),
  postProbe(
    "cyber_case_brief_deterministic",
    "/v1/streams/cyber-expert/case-brief",
    { cves: ["CVE-2024-0001"], includePublicCveRefresh: false, includeLocalModel: false },
    (body) =>
      body.readOnly === true &&
      body.report?.schemaId === "aoe.cyber_expert_case_brief.v1" &&
      body.report?.publicCveRefresh === null &&
      body.report?.localModelPreview === null,
  ),
];

const results: ProbeResult[] = [];
for (const probe of probes) {
  results.push(await probe());
}

const ok = results.every((result) => result.status === "pass");
console.log(
  JSON.stringify(
    {
      ok,
      baseUrl: redactBaseUrl(baseUrl),
      generatedAt: new Date().toISOString(),
      liveSettlementAllowed: false,
      externalSideEffectsAllowed: false,
      probes: results,
    },
    null,
    2,
  ),
);
process.exit(ok ? 0 : 1);

function getProbe(name: string, path: string, validate: (body: any) => boolean) {
  return () => runProbe(name, "GET", path, undefined, validate);
}

function postProbe(name: string, path: string, body: unknown, validate: (body: any) => boolean) {
  return () => runProbe(name, "POST", path, body, validate);
}

async function runProbe(
  name: string,
  method: "GET" | "POST",
  path: string,
  body: unknown,
  validate: (body: any) => boolean,
): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const res = await fetchWithTimeout(new URL(path, baseUrl).toString(), {
      method,
      headers: {
        Accept: "application/json",
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    });
    const parsed = await res.json().catch(() => null);
    return {
      name,
      method,
      path,
      status: res.ok && validate(parsed) ? "pass" : "fail",
      httpStatus: res.status,
      durationMs: Date.now() - started,
      error: res.ok ? null : `http_${res.status}`,
    };
  } catch (error) {
    return {
      name,
      method,
      path,
      status: "fail",
      httpStatus: null,
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : "unknown_probe_error",
    };
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("AOE_BASE_URL must use http or https.");
  }
  parsed.pathname = "/";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function redactBaseUrl(value: string): string {
  const parsed = new URL(value);
  return `${parsed.protocol}//${parsed.host}`;
}
