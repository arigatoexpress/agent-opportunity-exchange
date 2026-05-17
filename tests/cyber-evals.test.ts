import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { buildCyberExpertEvalReport, CYBER_EXPERT_EVAL_REPORT_SCHEMA_ID } from "../src/adapters/cyber-evals.js";
import { productRoutes } from "../src/catalog.js";

describe("cyber expert eval fixtures", () => {
  test("keeps deterministic model preview inside privacy and safety gates", () => {
    const report = buildCyberExpertEvalReport();

    expect(report.schemaId).toBe(CYBER_EXPERT_EVAL_REPORT_SCHEMA_ID);
    expect(report.mode).toBe("deterministic_eval_fixture_report");
    expect(report.targetSchemaId).toBe("aoe.cyber_expert_model_preview.v1");
    expect(report.caseCount).toBeGreaterThanOrEqual(4);
    expect(report.failedCount).toBe(0);
    expect(report.passed).toBe(true);
    expect(report.safetyScope).toContain("private field suppression");
    expect(report.evidenceProof.evalReportHash).toMatch(/^sha256:/);

    for (const result of report.cases) {
      expect(result.passed, `${result.caseId} failed: ${JSON.stringify(result.checks)}`).toBe(true);
      expect(result.checks.length).toBeGreaterThan(0);
    }
  });

  test("exposes the eval report as a public read-only route", async () => {
    const route = productRoutes.find((row) => row.routeId === "cyber_expert_eval_report");
    expect(route).toEqual(
      expect.objectContaining({
        route: "/v1/streams/cyber-expert/evals",
        method: "GET",
        schemaId: CYBER_EXPERT_EVAL_REPORT_SCHEMA_ID,
        x402Stream: false,
        readiness: "live_read_only",
      }),
    );

    const res = await createApp().request("/v1/streams/cyber-expert/evals");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.readOnly).toBe(true);
    expect(body.sideEffects).toBe("none");
    expect(body.report.schemaId).toBe(CYBER_EXPERT_EVAL_REPORT_SCHEMA_ID);
    expect(body.report.passed).toBe(true);
    expect(body.report.failedCount).toBe(0);
  });
});
