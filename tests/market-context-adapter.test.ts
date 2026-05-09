import { describe, expect, test } from "vitest";
import { fetchMarketContextReport } from "../src/adapters/market-context.js";

describe("market context stream adapter", () => {
  test("combines SEC filings and FRED macro observations into one stream payload", async () => {
    const report = await fetchMarketContextReport(
      {
        ticker: "TEST",
        seriesIds: ["FEDFUNDS", "UNRATE"],
        filingLimit: 1,
        seriesLimit: 1,
      },
      async (url) => {
        if (url.endsWith("/company_tickers.json")) {
          return jsonResponse({
            "0": { cik_str: 12345, ticker: "TEST", title: "Test Company Inc." },
          });
        }

        if (url === "https://data.sec.gov/submissions/CIK0000012345.json") {
          return jsonResponse({
            name: "Test Company Inc.",
            filings: {
              recent: {
                accessionNumber: ["0000012345-26-000010"],
                filingDate: ["2026-05-01"],
                reportDate: ["2026-03-31"],
                form: ["10-Q"],
                primaryDocument: ["test-10q.htm"],
              },
            },
          });
        }

        const seriesId = new URL(url).searchParams.get("id");
        return new Response(`observation_date,${seriesId}
2026-04-01,4.25
`, { status: 200, headers: { "Content-Type": "text/csv" } });
      },
    );

    expect(report.schemaVersion).toBe("sapphirealpha.market_context.v1");
    expect(report.x402Stream).toBe(true);
    expect(report.company.ticker).toBe("TEST");
    expect(report.filings[0].form).toBe("10-Q");
    expect(report.macro.map((series) => series.seriesId)).toEqual(["FEDFUNDS", "UNRATE"]);
    expect(report.highlights.map((highlight) => highlight.sourceId)).toContain("sec_edgar");
    expect(report.caveats.join(" ")).toContain("not investment advice");
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
