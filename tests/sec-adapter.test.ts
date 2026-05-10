import { describe, expect, test } from "vitest";
import { fetchSecRecentFilings } from "../src/adapters/sec.js";

describe("SEC EDGAR adapter", () => {
  test("resolves ticker and returns recent filtered filings", async () => {
    const report = await fetchSecRecentFilings({ ticker: "TEST", forms: ["10-K", "8-K"], limit: 2 }, async (url) => {
      if (url.endsWith("/company_tickers.json")) {
        return jsonResponse({
          "0": { cik_str: 12345, ticker: "TEST", title: "Test Company Inc." },
        });
      }

      expect(url).toBe("https://data.sec.gov/submissions/CIK0000012345.json");
      return jsonResponse({
        name: "Test Company Inc.",
        filings: {
          recent: {
            accessionNumber: ["0000012345-26-000010", "0000012345-26-000009", "0000012345-26-000008"],
            filingDate: ["2026-05-01", "2026-04-15", "2026-04-01"],
            reportDate: ["2026-03-31", "2026-04-14", "2026-03-01"],
            form: ["10-Q", "8-K", "10-K"],
            primaryDocument: ["test-10q.htm", "test-8k.htm", "test-10k.htm"],
          },
        },
      });
    });

    expect(report.company.cik).toBe("0000012345");
    expect(report.company.ticker).toBe("TEST");
    expect(report.filings.map((filing) => filing.form)).toEqual(["8-K", "10-K"]);
    expect(report.filings[0].archiveUrl).toBe("https://www.sec.gov/Archives/edgar/data/12345/000001234526000009/test-8k.htm");
    expect(report.filings[0].recordHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(report.caveats.join(" ")).toContain("not investment advice");
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
