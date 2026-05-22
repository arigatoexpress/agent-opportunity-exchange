import { buildCyberExpertEvalReport } from "../src/adapters/cyber-evals.js";
import { resolveCyberModelProvider } from "../src/adapters/cyber-model-provider.js";
import { fetchCyberWindowsOllamaStatus } from "../src/adapters/cyber-windows-ollama.js";

async function main() {
  const evalReport = buildCyberExpertEvalReport();
  const provider = resolveCyberModelProvider(process.env, evalReport.evidenceProof.evalSuiteHash);
  const windowsOllama = await fetchCyberWindowsOllamaStatus();

  console.log(
    JSON.stringify(
      {
        schemaId: "aoe.cyber_expert.operator_status.v1",
        generatedAt: new Date().toISOString(),
        readOnly: true,
        sideEffects: "none",
        provider,
        eval: {
          schemaId: evalReport.schemaId,
          passed: evalReport.passed,
          caseCount: evalReport.caseCount,
          passedCount: evalReport.passedCount,
          failedCount: evalReport.failedCount,
          evalReportHash: evalReport.evidenceProof.evalReportHash,
          evalSuiteHash: evalReport.evidenceProof.evalSuiteHash,
        },
        windowsOllama,
        safety: {
          modelCallsMade: 0,
          chatCallsAllowed: false,
          statusCommandChatCallsAllowed: false,
          localModelPreviewRouteCanChat: provider.status === "ready_windows_ollama_capped_worker",
          providerChatAllowlistAcknowledged: provider.gate.chatAllowlistAcknowledged,
          localGpuUsed: false,
          paidApiUsed: false,
          externalSideEffectsAllowed: false,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        schemaId: "aoe.cyber_expert.operator_status.v1",
        ok: false,
        error: error instanceof Error ? error.message : "Unknown cyber expert status error",
        readOnly: true,
        sideEffects: "none",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
