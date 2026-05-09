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
