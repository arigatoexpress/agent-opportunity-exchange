import { describe, expect, test } from "vitest";
import { buildCyberExpertCaseBrief } from "../src/adapters/cyber-case-brief.js";
import type { CyberInventoryPriorityPreview, VulnPriorityReport } from "../src/adapters/cyber.js";
import { renderCyberExpertCaseBriefHtml, renderCyberInventoryPriorityHtml, renderCyberPriorityHtml } from "../src/reporting/cyber-html.js";

describe("cyber HTML report", () => {
  test("escapes dynamic content and renders core report fields", () => {
    const report: VulnPriorityReport = {
      generatedAt: "2026-05-08T00:00:00.000Z",
      inputCount: 1,
      sources: [{ sourceId: "cisa_kev", url: "https://example.test/?a=1&b=2", retrievalMode: "read_only_public_api" }],
      findings: [
        {
          cve: "CVE-2026-0001",
          tier: "fix_today",
          reason: "Needs <review> & validation.",
          kev: { knownExploited: true },
          epss: { score: 0.5, percentile: 0.95 },
          nvd: {
            cve: "CVE-2026-0001",
            baseScore: 9.8,
            baseSeverity: "CRITICAL",
            description: null,
          },
          outputPolicy: ["No exploit payloads."],
        },
      ],
      caveats: ["Do not treat this as <proof> of exploitability."],
    };

    const html = renderCyberPriorityHtml(report);
    expect(html).toContain("Exploited Vulnerability Priority Pack");
    expect(html).toContain("CVE-2026-0001");
    expect(html).toContain("fix today");
    expect(html).toContain("Needs &lt;review&gt; &amp; validation.");
    expect(html).not.toContain("Needs <review>");
  });

  test("renders authorized inventory proof without leaking unsafe content", () => {
    const report: CyberInventoryPriorityPreview = {
      schemaVersion: "sapphirealpha.cyber_inventory_priority.preview.v1",
      generatedAt: "2026-05-08T00:00:00.000Z",
      input: {
        buyer: { buyerId: "msp-demo", name: "MSP <Demo>", useCase: "client proof" },
        cveCount: 1,
        assetRows: 1,
        authorizedInventoryRequired: true,
      },
      sources: [{ sourceId: "cisa_kev", url: "https://example.test/source?x=1&y=2", retrievalMode: "read_only_public_api" }],
      summary: {
        fixToday: 1,
        fixThisWeek: 0,
        monitor: 0,
        needsReview: 0,
        affectedAssets: 1,
      },
      findings: [
        {
          cve: "CVE-2026-0001",
          tier: "fix_today",
          reason: "Known exploited.",
          kev: { knownExploited: true },
          epss: { score: 0.5, percentile: 0.95 },
          nvd: { cve: "CVE-2026-0001", baseScore: 9.8, baseSeverity: "CRITICAL", description: null },
          outputPolicy: ["No exploit payloads."],
          buyerEvidence: {
            affectedAssetCount: 1,
            affectedAssets: [
              {
                hostname: "vpn-<1>",
                label: "vpn-<1>",
                environment: "production",
                criticality: "critical",
                internetFacing: true,
                evidenceFields: ["hostname", "cves"],
              },
            ],
            exposureSignals: ["internet_facing_asset"],
            buyerPriorityReason: "Patch vpn-<1> first & validate.",
          },
        },
      ],
      caveats: ["Buyer inventory only."],
      outputPolicy: ["Defensive prioritization only.", "No exploit payloads."],
    };

    const html = renderCyberInventoryPriorityHtml(report);
    expect(html).toContain("Authorized Cyber Inventory Priority Report");
    expect(html).toContain("MSP &lt;Demo&gt;");
    expect(html).toContain("vpn-&lt;1&gt;");
    expect(html).toContain("Patch vpn-&lt;1&gt; first &amp; validate.");
    expect(html).not.toContain("vpn-<1>");
    expect(html).not.toMatch(/payload:|run this exploit|credential dump/i);
  });

  test("renders cyber expert case brief HTML with escaped private-facing fields", async () => {
    const brief = await buildCyberExpertCaseBrief(
      {
        caseTitle: "Client <Case> 0x1111111111111111111111111111111111111111",
        cves: ["CVE-2024-0001"],
        inventory: {
          assets: [
            {
              hostname: "prod-api-01.internal",
              label: "edge <gateway>",
              cves: ["CVE-2024-0001"],
              criticality: "critical",
              internetFacing: true,
            },
          ],
        },
        complianceProofs: [
          {
            subjectCommitment: "commitment:demo_subject",
            decision: "review",
            sourceMerkleRoot: "merkle:demo_root",
            sourceIds: ["ofac_sanctions_lists", "trm_sanctions_docs"],
          },
        ],
        notes: ["private token note"],
      },
      {
        includePublicCveRefresh: false,
        includeLocalModel: false,
      },
    );

    const html = renderCyberExpertCaseBriefHtml(brief);
    expect(html).toContain("Cyber Expert Case Brief");
    expect(html).toContain("Decision posture");
    expect(html).toContain("Priority Queue");
    expect(html).toContain("Brief hash");
    expect(html).toContain("Client &lt;Case&gt; [redacted_wallet]");
    expect(html).not.toContain("Client <Case>");
    expect(html).not.toContain("prod-api-01.internal");
    expect(html).not.toContain("private token note");
    expect(html).not.toMatch(/run this exploit|credential dump|payload:/i);
  });
});
