import { describe, expect, test } from "vitest";
import { buildVulnPriorityReport } from "../src/adapters/cyber.js";

describe("cyber source adapter", () => {
  test("ranks KEV and elevated EPSS ahead of low-risk monitor items", async () => {
    const report = await buildVulnPriorityReport(
      ["CVE-2024-0001", "CVE-2024-0002", "CVE-2024-0003"],
      async (url) => {
        if (url.includes("cisa.gov")) {
          return jsonResponse({
            vulnerabilities: [
              {
                cveID: "CVE-2024-0002",
                vendorProject: "ExampleVendor",
                product: "ExampleProduct",
                dateAdded: "2026-01-02",
                dueDate: "2026-01-23",
                requiredAction: "Apply vendor update.",
                knownRansomwareCampaignUse: "Known",
              },
            ],
          });
        }

        if (url.includes("services.nvd.nist.gov")) {
          const cve = new URL(url).searchParams.get("cveId");
          return jsonResponse({
            vulnerabilities: [
              {
                cve: {
                  id: cve,
                  published: "2026-01-01T00:00:00.000",
                  lastModified: "2026-01-03T00:00:00.000",
                  descriptions: [{ lang: "en", value: `${cve} is a synthetic test vulnerability used for defensive prioritization.` }],
                  metrics: {
                    cvssMetricV31: [
                      {
                        cvssData: {
                          baseScore: cve === "CVE-2024-0003" ? 4.3 : 9.8,
                          baseSeverity: cve === "CVE-2024-0003" ? "MEDIUM" : "CRITICAL",
                        },
                      },
                    ],
                  },
                },
              },
            ],
          });
        }

        return jsonResponse({
          data: [
            { cve: "CVE-2024-0001", epss: "0.330000", percentile: "0.950000", date: "2026-05-08" },
            { cve: "CVE-2024-0002", epss: "0.010000", percentile: "0.200000", date: "2026-05-08" },
            { cve: "CVE-2024-0003", epss: "0.001000", percentile: "0.100000", date: "2026-05-08" },
          ],
        });
      },
    );

    expect(report.findings.map((finding) => finding.cve)).toEqual(["CVE-2024-0002", "CVE-2024-0001", "CVE-2024-0003"]);
    expect(report.findings[0].tier).toBe("fix_today");
    expect(report.findings[0].kev.knownExploited).toBe(true);
    expect(report.findings[1].tier).toBe("fix_this_week");
    expect(report.findings[2].tier).toBe("monitor");
    expect(report.findings[0].nvd?.baseSeverity).toBe("CRITICAL");
    expect(report.sources.map((source) => source.sourceId)).toContain("nvd_cve");
    expect(report.findings[0].outputPolicy.join(" ")).toMatch(/No exploit payloads/i);
    expect(report.findings[0].outputPolicy.join(" ")).not.toMatch(/run this exploit|payload:/i);
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
