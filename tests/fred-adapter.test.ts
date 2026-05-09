import { describe, expect, test } from "vitest";
import { fetchFredSeriesReport, parseFredCsv } from "../src/adapters/fred.js";

describe("FRED adapter", () => {
  test("parses graph CSV observations", () => {
    const observations = parseFredCsv(`observation_date,FEDFUNDS
2026-01-01,4.33
2026-02-01,.
`, "FEDFUNDS");

    expect(observations).toEqual([
      { date: "2026-01-01", value: 4.33 },
      { date: "2026-02-01", value: null },
    ]);
  });

  test("fetches a bounded report for multiple series", async () => {
    const report = await fetchFredSeriesReport({ seriesIds: ["FEDFUNDS", "CPIAUCSL"], limit: 1 }, async (url) => {
      const seriesId = new URL(url).searchParams.get("id");
      return new Response(`observation_date,${seriesId}
2026-01-01,1.00
2026-02-01,2.00
`, { status: 200, headers: { "Content-Type": "text/csv" } });
    });

    expect(report.series).toHaveLength(2);
    expect(report.series[0].observations).toEqual([{ date: "2026-02-01", value: 2 }]);
    expect(report.caveats.join(" ")).toContain("not investment advice");
  });
});
