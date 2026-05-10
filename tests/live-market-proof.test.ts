import { describe, expect, test } from "vitest";
import { buildLiveMarketUpstreamProof, summarizeLiveMarketProof } from "../src/live-market-proof.js";

describe("live market upstream proof", () => {
  test("summarizes SEC and FRED evidence without advisory or settlement side effects", async () => {
    const proof = await buildLiveMarketUpstreamProof(
      {
        ticker: "TEST",
        seriesIds: ["FEDFUNDS", "UNRATE"],
        filingLimit: 1,
        seriesLimit: 1,
        mockDataUsed: true,
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

    expect(proof.schemaId).toBe("aoe.market_live_upstream_proof.v1");
    expect(proof.mode).toBe("read_only_live_source_probe");
    expect(proof.x402Stream).toBe(true);
    expect(proof.productId).toBe("market_regime_evidence_pack");
    expect(proof.mockDataUsed).toBe(true);
    expect(proof.overall).toBe("pass");
    expect(proof.upstream.sec_edgar).toMatchObject({
      status: "ok",
      observedRecords: 1,
      latestRecordDate: "2026-05-01",
      evidenceHashCount: 1,
    });
    expect(proof.upstream.fred_alfred).toMatchObject({
      status: "ok",
      observedRecords: 2,
      latestRecordDate: "2026-04-01",
      evidenceHashCount: 2,
    });
    expect(proof.reportSummary.evidenceProof.reportHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(proof.sourceEvidence.flatMap((source) => source.recordHashes)).toHaveLength(3);
    expect(proof.historicalClaimsPolicy).toEqual({
      revisionAware: false,
      liveMacroReadMode: "fred_graph_csv",
      productionHistoricalClaimsRequire: "alfred_vintages",
      notes: expect.arrayContaining([
        expect.stringContaining("FRED graph CSV"),
        expect.stringContaining("ALFRED vintage"),
      ]),
    });
    expect(proof.boundaries).toEqual({
      researchOnly: true,
      investmentAdvice: false,
      tradeExecution: false,
      personalizedPortfolioAdvice: false,
      liveSettlementAllowed: false,
      externalSideEffectsAllowed: false,
    });
    expect(proof.caveats.join(" ")).toContain("not investment advice");
    expect(proof.caveats.join(" ")).toContain("does not make paid calls or move funds");
    expect(summarizeLiveMarketProof(proof)).toContain("market_live_upstream_proof pass");
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
