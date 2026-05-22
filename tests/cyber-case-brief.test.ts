import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { buildCyberExpertCaseBrief, CYBER_EXPERT_CASE_BRIEF_SCHEMA_ID } from "../src/adapters/cyber-case-brief.js";
import { productRoutes, streams } from "../src/catalog.js";
import { buildRoutePreviewQuote, expectedSimulatedPayment } from "../src/payments.js";

describe("cyber expert case brief", () => {
  test("composes deterministic preview with public CVE freshness without leaking private inventory", async () => {
    const requestedUrls: string[] = [];
    const brief = await buildCyberExpertCaseBrief(
      {
        caseTitle: "Buyer case 0x1111111111111111111111111111111111111111",
        inventory: {
          assets: [
            {
              hostname: "prod-api-01.internal",
              cves: ["CVE-2024-0001"],
              criticality: "critical",
              internetFacing: true,
            },
          ],
        },
        notes: ["private analyst note with api key"],
      },
      {
        includePublicCveRefresh: true,
        includeLocalModel: false,
        fetcher: async (url) => {
          requestedUrls.push(url);
          if (url.includes("cisa.gov")) {
            return jsonResponse({
              vulnerabilities: [
                {
                  cveID: "CVE-2024-0001",
                  vendorProject: "ExampleVendor",
                  product: "ExampleProduct",
                  vulnerabilityName: "Example KEV",
                },
              ],
            });
          }
          if (url.includes("api.first.org")) {
            return jsonResponse({
              data: [{ cve: "CVE-2024-0001", epss: "0.91", percentile: "0.99", date: "2026-05-17" }],
            });
          }
          if (url.includes("services.nvd.nist.gov")) return jsonResponse({ vulnerabilities: [] });
          if (url.includes("api.osv.dev")) return jsonResponse({ id: "CVE-2024-0001" }, 404);
          return jsonResponse({
            data: [],
          });
        },
      },
    );

    expect(brief.schemaId).toBe(CYBER_EXPERT_CASE_BRIEF_SCHEMA_ID);
    expect(brief.publicCveRefresh?.records[0].kev.knownExploited).toBe(true);
    expect(brief.publicCveRefresh?.records[0].epss.score).toBe(0.91);
    expect(brief.localModelPreview).toBeNull();
    expect(brief.operatorDecision.posture).toBe("ready_for_human_review");
    expect(brief.operatorDecision.fixTodayCount).toBe(1);
    expect(brief.operatorDecision.knownExploitedCount).toBe(1);
    expect(brief.operatorDecision.highEpssCount).toBe(1);
    expect(brief.safety.privateDataSentToPublicSources).toBe(false);
    expect(brief.evidenceProof.briefHash).toMatch(/^sha256:/);

    const requested = requestedUrls.join(" ");
    expect(requested).toContain("CVE-2024-0001");
    expect(requested).not.toContain("prod-api-01.internal");
    expect(requested).not.toContain("0x1111111111111111111111111111111111111111");

    const serialized = JSON.stringify(brief);
    expect(serialized).not.toContain("prod-api-01.internal");
    expect(serialized).not.toContain("private analyst note");
    expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  });

  test("does not touch local model when includeLocalModel is false even if env is configured", async () => {
    const brief = await buildCyberExpertCaseBrief(
      { cves: ["CVE-2024-0001"] },
      {
        includePublicCveRefresh: false,
        includeLocalModel: false,
        env: {
          AOE_CYBER_MODEL_PROVIDER: "windows_ollama_capped_worker",
          AOE_CYBER_MODEL_PROVIDER_ENABLED: "true",
          AOE_CYBER_MODEL_CHAT_ALLOWED: "true",
          AOE_WINDOWS_OLLAMA_URL: "http://192.0.2.10:11434",
          AOE_CYBER_MODEL_NAME: "qwen3:8b",
        },
        fetcher: async () => {
          throw new Error("fetch should not be called when optional fetch/model lanes are disabled");
        },
      },
    );

    expect(brief.publicCveRefresh).toBeNull();
    expect(brief.localModelPreview).toBeNull();
    expect(brief.operatorDecision.posture).toBe("needs_authorized_inventory");
    expect(brief.operatorDecision.recommendedActions.join(" ")).toMatch(/authorized inventory/i);
  });

  test("registers stream and route; app route can run deterministic-only", async () => {
    const stream = streams.find((row) => row.streamId === "cyber_expert_case_brief");
    expect(stream?.route).toBe("/v1/streams/cyber-expert/case-brief");
    expect(stream?.inputSchema.includePublicCveRefresh).toBeTruthy();

    const route = productRoutes.find((row) => row.routeId === "cyber_expert_case_brief");
    expect(route).toEqual(
      expect.objectContaining({
        route: "/v1/streams/cyber-expert/case-brief",
        method: "POST",
        schemaId: CYBER_EXPERT_CASE_BRIEF_SCHEMA_ID,
        readiness: "live_read_only",
      }),
    );

    const res = await createApp().request("/v1/streams/cyber-expert/case-brief", {
      method: "POST",
      body: JSON.stringify({ cves: ["CVE-2024-0001"], includePublicCveRefresh: false }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.readOnly).toBe(true);
    expect(body.report.schemaId).toBe(CYBER_EXPERT_CASE_BRIEF_SCHEMA_ID);
    expect(body.report.publicCveRefresh).toBeNull();
    expect(body.report.localModelPreview).toBeNull();
    expect(body.report.operatorDecision.humanReviewRequired).toBe(true);
  });

  test("app route requires simulated payment before public refresh or local model lanes", async () => {
    const unpaid = await createApp().request("/v1/streams/cyber-expert/case-brief", {
      method: "POST",
      body: JSON.stringify({ cves: ["CVE-2024-0001"] }),
      headers: { "Content-Type": "application/json" },
    });
    expect(unpaid.status).toBe(402);
    const unpaidBody = await unpaid.json();
    expect(unpaidBody.error).toBe("payment_required");
    expect(unpaidBody.publicFallback.body).toEqual({ includePublicCveRefresh: false, includeLocalModel: false });
    expect(unpaid.headers.get("Payment-Required")).toBeTruthy();

    const quote = buildRoutePreviewQuote({
      routeId: "cyber_expert_case_brief",
      productId: "cyber_expert_model_preview_pack",
      priceUsd: "1.2500",
      sourceIds: [
        "buyer_authorized_inventory",
        "cisa_kev",
        "nvd_cve",
        "first_epss",
        "osv",
        "crypto_incident_public_metadata",
        "defillama",
        "trm_sanctions_docs",
        "ofac_sanctions_lists",
      ],
    });
    const paidDeterministic = await createApp().request("/v1/streams/cyber-expert/case-brief", {
      method: "POST",
      body: JSON.stringify({ cves: ["CVE-2024-0001"], includePublicCveRefresh: false, includeLocalModel: false }),
      headers: { "Content-Type": "application/json", "X-AOE-Payment": expectedSimulatedPayment(quote.workOrderId) },
    });
    expect(paidDeterministic.status).toBe(200);
  });

  test("case brief report route returns escaped HTML for deterministic public mode and gates refresh", async () => {
    const deterministic = await createApp().request("/v1/streams/cyber-expert/case-brief/report", {
      method: "POST",
      body: JSON.stringify({
        caseTitle: "Client <Case> 0x1111111111111111111111111111111111111111",
        cves: ["CVE-2024-0001"],
        includePublicCveRefresh: false,
        includeLocalModel: false,
      }),
      headers: { "Content-Type": "application/json" },
    });
    expect(deterministic.status).toBe(200);
    const deterministicBody = await deterministic.json();
    expect(deterministicBody.schemaId).toBe("aoe.cyber_expert_case_brief.report.v1");
    expect(deterministicBody.contentType).toBe("text/html");
    expect(deterministicBody.reportHtml).toContain("Cyber Expert Case Brief");
    expect(deterministicBody.reportHtml).toContain("Client &lt;Case&gt; [redacted_wallet]");
    expect(deterministicBody.reportHtml).not.toContain("Client <Case>");
    expect(deterministicBody.reportHtml).not.toContain("0x1111111111111111111111111111111111111111");

    const unpaidRefresh = await createApp().request("/v1/streams/cyber-expert/case-brief/report", {
      method: "POST",
      body: JSON.stringify({ cves: ["CVE-2024-0001"] }),
      headers: { "Content-Type": "application/json" },
    });
    expect(unpaidRefresh.status).toBe(402);
    const unpaidBody = await unpaidRefresh.json();
    expect(unpaidBody.error).toBe("payment_required");
    expect(unpaidBody.publicFallback.body).toEqual({ includePublicCveRefresh: false, includeLocalModel: false });
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
