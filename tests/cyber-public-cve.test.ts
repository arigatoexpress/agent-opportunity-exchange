import { afterEach, describe, expect, test, vi } from "vitest";
import { createApp } from "../src/app.js";
import {
  clearCyberPublicCveCache,
  fetchCyberPublicCveRefresh,
  CYBER_PUBLIC_CVE_REFRESH_SCHEMA_ID,
} from "../src/adapters/cyber-public-cve.js";
import { productRoutes } from "../src/catalog.js";

describe("cyber public CVE refresh", () => {
  afterEach(() => {
    clearCyberPublicCveCache();
    vi.unstubAllGlobals();
  });

  test("fetches public CVE sources by CVE only", async () => {
    const requestedUrls: string[] = [];
    const report = await fetchCyberPublicCveRefresh(["CVE-2024-0001"], async (url) => {
      requestedUrls.push(url);
      if (url.includes("cisa.gov")) {
        return jsonResponse({
          vulnerabilities: [
            {
              cveID: "CVE-2024-0001",
              vendorProject: "ExampleVendor",
              product: "ExampleProduct",
              vulnerabilityName: "Example vulnerability",
              dateAdded: "2026-05-01",
              dueDate: "2026-05-22",
              requiredAction: "Apply mitigations per vendor instructions.",
            },
          ],
        });
      }
      if (url.includes("api.first.org")) {
        return jsonResponse({
          data: [{ cve: "CVE-2024-0001", epss: "0.42", percentile: "0.95", date: "2026-05-17" }],
        });
      }
      if (url.includes("services.nvd.nist.gov")) {
        return jsonResponse({
          vulnerabilities: [
            {
              cve: {
                id: "CVE-2024-0001",
                published: "2026-05-01T00:00:00.000",
                lastModified: "2026-05-02T00:00:00.000",
                vulnStatus: "Analyzed",
                descriptions: [{ lang: "en", value: "Example NVD description." }],
                references: { referenceData: [{ url: "https://example.test" }] },
                metrics: { cvssMetricV31: [{ cvssData: { baseScore: 9.8, baseSeverity: "CRITICAL" } }] },
              },
            },
          ],
        });
      }
      if (url.includes("api.osv.dev")) {
        return jsonResponse({
          id: "CVE-2024-0001",
          summary: "Example OSV summary.",
          modified: "2026-05-03T00:00:00Z",
          published: "2026-05-01T00:00:00Z",
          aliases: ["GHSA-example"],
          affected: [{ package: { ecosystem: "npm", name: "example" } }],
          references: [{ type: "ADVISORY", url: "https://example.test" }],
        });
      }
      return jsonResponse({});
    });

    expect(requestedUrls).toHaveLength(4);
    expect(requestedUrls[0]).toBe("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json");
    const epssUrl = new URL(requestedUrls[1]);
    expect(epssUrl.origin + epssUrl.pathname).toBe("https://api.first.org/data/v1/epss");
    expect(epssUrl.searchParams.get("cve")).toBe("CVE-2024-0001");
    const nvdUrl = new URL(requestedUrls[2]);
    expect(nvdUrl.origin + nvdUrl.pathname).toBe("https://services.nvd.nist.gov/rest/json/cves/2.0");
    expect(nvdUrl.searchParams.get("cveIds")).toBe("CVE-2024-0001");
    expect(requestedUrls[3]).toBe("https://api.osv.dev/v1/vulns/CVE-2024-0001");

    expect(report.schemaId).toBe(CYBER_PUBLIC_CVE_REFRESH_SCHEMA_ID);
    expect(report.requestedCveCount).toBe(1);
    expect(report.returnedCveCount).toBe(1);
    expect(report.truncatedCveCount).toBe(0);
    expect(report.sourceResults.every((source) => source.cacheStatus === "bypass")).toBe(true);
    expect(report.sourceResults.every((source) => source.durationMs >= 0)).toBe(true);
    expect(report.records[0]).toEqual(
      expect.objectContaining({
        cve: "CVE-2024-0001",
        kev: expect.objectContaining({ knownExploited: true, vendorProject: "ExampleVendor" }),
        epss: expect.objectContaining({ score: 0.42, percentile: 0.95 }),
        nvd: expect.objectContaining({ found: true, severity: "CRITICAL", baseScore: 9.8 }),
        osv: expect.objectContaining({ found: true, id: "CVE-2024-0001", affectedPackageCount: 1 }),
        sourceIds: ["cisa_kev", "first_epss", "nvd_cve", "osv"],
      }),
    );
    expect(report.safety.privateDataSent).toBe(false);
    expect(report.safety.hostnamesSent).toBe(false);
    expect(report.safety.activeScanningAllowed).toBe(false);
    expect(report.evidenceProof.reportHash).toMatch(/^sha256:/);
  });

  test("degrades source failures without throwing or inventing facts", async () => {
    const report = await fetchCyberPublicCveRefresh(["CVE-2024-0001"], async () => jsonResponse({ error: "nope" }, 500));

    expect(report.sourceResults).toEqual([
      expect.objectContaining({ sourceId: "cisa_kev", status: "degraded", errorCode: "cisa_kev_fetch_failed" }),
      expect.objectContaining({ sourceId: "first_epss", status: "degraded", errorCode: "first_epss_fetch_failed" }),
      expect.objectContaining({ sourceId: "nvd_cve", status: "degraded", errorCode: "nvd_cve_fetch_failed" }),
      expect.objectContaining({ sourceId: "osv", status: "degraded", errorCode: "osv_fetch_failed" }),
    ]);
    expect(report.records[0].kev.knownExploited).toBe(false);
    expect(report.records[0].epss.score).toBeNull();
    expect(report.records[0].nvd.found).toBe(false);
    expect(report.records[0].osv.found).toBe(false);
  });

  test("uses the in-memory TTL cache for default fetch calls", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      requestedUrls.push(url);
      if (url.includes("cisa.gov")) return jsonResponse({ vulnerabilities: [] });
      if (url.includes("api.first.org")) return jsonResponse({ data: [] });
      if (url.includes("services.nvd.nist.gov")) return jsonResponse({ vulnerabilities: [] });
      if (url.includes("api.osv.dev")) return jsonResponse({}, 404);
      return jsonResponse({});
    });

    const first = await fetchCyberPublicCveRefresh(["CVE-2024-0001"]);
    const second = await fetchCyberPublicCveRefresh(["CVE-2024-0001"]);

    expect(first.sourceResults.map((source) => source.cacheStatus)).toEqual(["miss", "miss", "miss", "miss"]);
    expect(second.sourceResults.map((source) => source.cacheStatus)).toEqual(["hit", "hit", "hit", "hit"]);
    expect(requestedUrls).toHaveLength(4);
  });

  test("caps CVE batches at 50 and reports truncation", async () => {
    const cves = Array.from({ length: 51 }, (_, index) => `CVE-2024-${String(1000 + index).padStart(4, "0")}`);
    const requestedUrls: string[] = [];
    const report = await fetchCyberPublicCveRefresh(cves, async (url) => {
      requestedUrls.push(url);
      if (url.includes("cisa.gov")) return jsonResponse({ vulnerabilities: [] });
      if (url.includes("api.first.org")) return jsonResponse({ data: [] });
      if (url.includes("services.nvd.nist.gov")) return jsonResponse({ vulnerabilities: [] });
      if (url.includes("api.osv.dev")) return jsonResponse({}, 404);
      return jsonResponse({});
    });

    expect(report.requestedCveCount).toBe(51);
    expect(report.returnedCveCount).toBe(50);
    expect(report.truncatedCveCount).toBe(1);
    expect(requestedUrls.filter((url) => url.includes("api.osv.dev"))).toHaveLength(50);
  });

  test("keeps partial OSV records when one CVE lookup fails", async () => {
    const report = await fetchCyberPublicCveRefresh(["CVE-2024-0001", "CVE-2024-0002"], async (url) => {
      if (url.includes("cisa.gov")) return jsonResponse({ vulnerabilities: [] });
      if (url.includes("api.first.org")) return jsonResponse({ data: [] });
      if (url.includes("services.nvd.nist.gov")) return jsonResponse({ vulnerabilities: [] });
      if (url.endsWith("/CVE-2024-0002")) return jsonResponse({ error: "upstream failed" }, 500);
      if (url.includes("api.osv.dev")) return jsonResponse({ id: "CVE-2024-0001", affected: [], references: [] });
      return jsonResponse({});
    });

    const osv = report.sourceResults.find((source) => source.sourceId === "osv");
    expect(osv).toEqual(expect.objectContaining({ status: "degraded", errorCode: "osv_partial_fetch_failed" }));
    expect(report.records.find((record) => record.cve === "CVE-2024-0001")?.osv.found).toBe(true);
    expect(report.records.find((record) => record.cve === "CVE-2024-0002")?.osv.found).toBe(false);
  });

  test("does not send hostnames or inventory to public sources", async () => {
    const requestedUrls: string[] = [];
    await fetchCyberPublicCveRefresh(["CVE-2024-0001", "not-a-cve"], async (url) => {
      requestedUrls.push(url);
      if (url.includes("cisa.gov")) return jsonResponse({ vulnerabilities: [] });
      if (url.includes("nvd.nist.gov")) return jsonResponse({ vulnerabilities: [] });
      if (url.includes("api.osv.dev")) return jsonResponse({ id: "CVE-2024-0001" }, 404);
      return jsonResponse({ data: [] });
    });

    const serializedUrls = requestedUrls.join(" ");
    expect(serializedUrls).toContain("CVE-2024-0001");
    expect(serializedUrls).not.toContain("not-a-cve");
    expect(serializedUrls).not.toContain("hostname");
    expect(serializedUrls).not.toContain("inventory");
    expect(serializedUrls).not.toContain("secret");
  });

  test("registers public route and rejects invalid payloads before fetch", async () => {
    const route = productRoutes.find((row) => row.routeId === "cyber_public_cve_refresh");
    expect(route).toEqual(
      expect.objectContaining({
        route: "/v1/streams/cyber-expert/public-cve-refresh",
        method: "POST",
        schemaId: CYBER_PUBLIC_CVE_REFRESH_SCHEMA_ID,
        readiness: "live_read_only",
      }),
    );

    const res = await createApp().request("/v1/streams/cyber-expert/public-cve-refresh", {
      method: "POST",
      body: JSON.stringify({ cves: ["not-a-cve"] }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  test("public route rejects batches over 50 CVEs before fetch", async () => {
    const cves = Array.from({ length: 51 }, (_, index) => `CVE-2024-${String(1000 + index).padStart(4, "0")}`);
    const res = await createApp().request("/v1/streams/cyber-expert/public-cve-refresh", {
      method: "POST",
      body: JSON.stringify({ cves }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
