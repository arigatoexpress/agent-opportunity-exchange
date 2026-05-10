import { describe, expect, test } from "vitest";
import { fetchMarketContextReport, withSourceTimeout } from "../src/adapters/market-context.js";

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
    expect(report.company?.ticker).toBe("TEST");
    expect(report.filings[0].form).toBe("10-Q");
    expect(report.filings[0].recordHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(report.macro.map((series) => series.seriesId)).toEqual(["FEDFUNDS", "UNRATE"]);
    expect(report.macro.every((series) => /^sha256:[a-f0-9]{64}$/.test(series.recordHash))).toBe(true);
    expect(report.evidenceProof).toMatchObject({
      algorithm: "sha256",
      canonicalization: "stable-json-sorted-keys-v1",
      reportHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      filingRecordHashes: [report.filings[0].recordHash],
    });
    expect(report.evidenceProof.macroObservationRecordHashes).toHaveLength(2);
    expect(report.highlights.map((highlight) => highlight.sourceId)).toContain("sec_edgar");
    expect(report.caveats.join(" ")).toContain("not investment advice");
  });

  test("labels slow SEC upstream calls as bounded timeouts", async () => {
    const bounded = withSourceTimeout(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted by test signal")));
        }),
      5,
    );

    await expect(bounded("https://data.sec.gov/submissions/CIK0000012345.json")).rejects.toThrow("SEC request timed out after 5ms");
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
