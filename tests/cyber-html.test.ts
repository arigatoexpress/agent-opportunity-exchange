import { describe, expect, test } from "vitest";
import type { VulnPriorityReport } from "../src/adapters/cyber.js";
import { renderCyberPriorityHtml } from "../src/reporting/cyber-html.js";

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
});
