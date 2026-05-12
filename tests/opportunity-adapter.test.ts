import { describe, expect, test } from "vitest";
import { buildOpportunityPublicProgramsPreview } from "../src/adapters/opportunity.js";

describe("opportunity public programs adapter", () => {
  test("combines unauthenticated Grants.gov search and Data.gov metadata with SAM.gov key-required posture", async () => {
    const report = await buildOpportunityPublicProgramsPreview({ keyword: "wildfire", limit: 4 }, async (url, init) => {
      if (url === "https://api.grants.gov/v1/api/search2") {
        expect(init?.method).toBe("POST");
        expect(String(init?.body)).toContain('"keyword":"wildfire"');
        return jsonResponse({
          data: {
            oppHits: [
              {
                id: "361818",
                number: "G26AS00010",
                title: "USGS Cooperative Landslide Hazard Mapping and Assessment Program",
                agency: "Geological Survey",
                openDate: "04/08/2026",
                closeDate: "06/08/2026",
                oppStatus: "posted",
                cfdaList: ["15.821"],
              },
            ],
          },
        });
      }

      expect(url).toContain("https://catalog.data.gov/search");
      expect(url).toContain("q=wildfire");
      return jsonResponse({
        results: [
          {
            title: "Wildfire Probabilities and Mortality Raster Maps",
            description: "ArcGIS raster maps for wildfire risk and tree loss probability.",
            identifier: "https://doi.org/10.23719/1532290",
            publisher: "U.S. Environmental Protection Agency",
            keyword: ["Wildfire Risk"],
            distribution_titles: ["ArcGIS raster maps"],
            last_harvested_date: "2026-04-21T20:07:24.320772",
            has_spatial: false,
            dcat: {
              accessLevel: "public",
              landingPage: "https://www.canr.msu.edu/FERM/Tools/Wildfire-Probability-and-Mortality/",
            },
          },
        ],
      });
    });

    expect(report.schemaVersion).toBe("aoe.adapter.opportunity_public_programs.preview.v1");
    expect(report.productId).toBe("opportunity_intel_pack");
    expect(report.x402Stream).toBe(true);
    expect(report.summary.matchCount).toBe(2);
    expect(report.summary.grantsCount).toBe(1);
    expect(report.summary.dataGovCount).toBe(1);
    expect(report.summary.keyRequiredSources).toEqual(["sam_gov_opportunities"]);
    expect(report.sources).toContainEqual(
      expect.objectContaining({
        sourceId: "sam_gov_opportunities",
        status: "key_required",
        retrievalMode: "key_required_public_api",
      }),
    );
    expect(report.matches[0]).toEqual(
      expect.objectContaining({
        sourceId: "grants_gov",
        title: "USGS Cooperative Landslide Hazard Mapping and Assessment Program",
        closeDate: "06/08/2026",
        recordHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      }),
    );
    expect(report.matches[1]).toEqual(
      expect.objectContaining({
        sourceId: "data_gov_catalog",
        agency: "U.S. Environmental Protection Agency",
        status: "public",
        recordHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      }),
    );
    expect(report.outputPolicy.join(" ")).toContain("Do not resell raw opportunity packages");
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}
