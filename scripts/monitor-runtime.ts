import { execFile } from "node:child_process";
import { promisify } from "node:util";

interface MonitorCheck {
  checkId: string;
  ok: boolean;
  severity: "info" | "warning" | "critical";
  summary: string;
  details?: unknown;
}

const baseUrl = (process.env.AOE_MONITOR_BASE_URL ?? "https://sapphirealpha.xyz").replace(/\/+$/, "");
const githubApiUrl =
  process.env.AOE_MONITOR_GITHUB_RUNS_URL ??
  "https://api.github.com/repos/arigatoexpress/agent-opportunity-exchange/actions/runs?branch=main&per_page=1";
const execFileAsync = promisify(execFile);

const checks: MonitorCheck[] = [];
const [health, x402, readiness, routes, ci] = await Promise.all([
  getJson(`${baseUrl}/health`),
  getJson(`${baseUrl}/v1/x402/status`),
  getJson(`${baseUrl}/v1/readiness`),
  getJson(`${baseUrl}/v1/routes`),
  getGitHubCi(),
]);

checks.push(
  evaluate("health", health.ok, "critical", health.ok ? "Public health is ok." : "Public health endpoint failed.", health),
  evaluate(
    "x402_testnet",
    x402.ok && x402.body?.activeRail === "official_x402_testnet" && x402.body?.network?.id === "eip155:84532" && x402.body?.liveSettlementAllowed === false,
    "critical",
    x402.ok ? `x402 rail is ${x402.body?.activeRail ?? "unknown"}.` : "x402 status endpoint failed.",
    summarizeX402(x402.body),
  ),
  evaluate(
    "buyer_discovery",
    readiness.ok && readiness.body?.contracts?.buyerDiscoveryReady === true,
    "critical",
    readiness.ok ? "Buyer discovery contract is ready." : "Readiness endpoint failed.",
    readiness.body?.contracts,
  ),
  evaluate(
    "route_catalog",
    routes.ok && Array.isArray(routes.body?.routes) && routes.body.routes.some((route: { routeId?: string }) => route.routeId === "x402_status"),
    "warning",
    routes.ok ? `Route catalog has ${routes.body?.routes?.length ?? 0} routes.` : "Route catalog endpoint failed.",
    {
      routeCount: routes.body?.routes?.length,
      hasX402Status: routes.body?.routes?.some((route: { routeId?: string }) => route.routeId === "x402_status") ?? false,
      wildfireX402: routes.body?.routes
        ?.filter((route: { routeId?: string }) => route.routeId?.startsWith("wildfire_"))
        .map((route: { routeId?: string; x402Stream?: boolean }) => ({ routeId: route.routeId, x402Stream: route.x402Stream })),
    },
  ),
  evaluate(
    "github_ci",
    ci.ok && ci.body?.workflow_runs?.[0]?.conclusion === "success",
    "warning",
    ci.ok ? `Latest GitHub CI conclusion is ${ci.body?.workflow_runs?.[0]?.conclusion ?? ci.body?.workflow_runs?.[0]?.status ?? "unknown"}.` : "GitHub CI lookup failed.",
    ci.body?.workflow_runs?.[0]
      ? {
          id: ci.body.workflow_runs[0].id,
          status: ci.body.workflow_runs[0].status,
          conclusion: ci.body.workflow_runs[0].conclusion,
          head_sha: ci.body.workflow_runs[0].head_sha,
          html_url: ci.body.workflow_runs[0].html_url,
        }
      : ci.body,
  ),
);

const criticalFailures = checks.filter((check) => !check.ok && check.severity === "critical");
const warningFailures = checks.filter((check) => !check.ok && check.severity === "warning");

console.log(
  JSON.stringify(
    {
      schemaVersion: "aoe.monitor.v1",
      generatedAt: new Date().toISOString(),
      baseUrl,
      ok: criticalFailures.length === 0,
      status: criticalFailures.length ? "critical" : warningFailures.length ? "warning" : "ok",
      counts: {
        checks: checks.length,
        criticalFailures: criticalFailures.length,
        warningFailures: warningFailures.length,
      },
      checks,
    },
    null,
    2,
  ),
);

if (criticalFailures.length > 0) {
  process.exitCode = 1;
}

function evaluate(checkId: string, ok: boolean, severity: "warning" | "critical", summary: string, details?: unknown): MonitorCheck {
  return {
    checkId,
    ok,
    severity: ok ? "info" : severity,
    summary,
    details,
  };
}

async function getJson(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: any }> {
  try {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: { error: error instanceof Error ? error.message : "unknown fetch error" },
    };
  }
}

async function getGitHubCi(): Promise<{ ok: boolean; status: number; body: any }> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "agent-opportunity-exchange-monitor",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const apiResult = await getJson(githubApiUrl, { headers });
  if (apiResult.ok || token || process.env.AOE_MONITOR_DISABLE_GH_CLI === "1") {
    return apiResult;
  }

  try {
    const { stdout } = await execFileAsync("gh", [
      "run",
      "list",
      "--branch",
      "main",
      "--limit",
      "1",
      "--json",
      "databaseId,status,conclusion,headSha,url,workflowName",
    ]);
    const [run] = JSON.parse(stdout) as Array<{
      databaseId: number;
      status: string;
      conclusion: string | null;
      headSha: string;
      url: string;
      workflowName: string;
    }>;
    return {
      ok: Boolean(run),
      status: Boolean(run) ? 200 : 404,
      body: {
        source: "gh_cli",
        workflow_runs: run
          ? [
              {
                id: run.databaseId,
                status: run.status,
                conclusion: run.conclusion,
                head_sha: run.headSha,
                html_url: run.url,
                name: run.workflowName,
              },
            ]
          : [],
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: apiResult.status,
      body: {
        api: apiResult.body,
        ghCli: error instanceof Error ? error.message : "unknown gh cli error",
      },
    };
  }
}

function summarizeX402(status: any): Record<string, unknown> {
  return {
    mode: status?.mode,
    activeRail: status?.activeRail,
    network: status?.network?.id,
    payToConfigured: status?.payTo?.configured,
    payTo: status?.payTo?.redacted,
    liveSettlementAllowed: status?.liveSettlementAllowed,
    serverPrivateKeyRequired: status?.serverPrivateKeyRequired,
    errors: status?.errors,
  };
}
