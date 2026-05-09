import { describe, expect, test } from "vitest";
import { fetchWfigsCurrentPerimeters } from "../src/adapters/wildfire.js";

describe("NIFC WFIGS perimeter adapter", () => {
  test("summarizes public ArcGIS perimeter records", async () => {
    const report = await fetchWfigsCurrentPerimeters({ state: "CO", limit: 1 }, async (url) => {
      expect(url).toContain("resultRecordCount=1");
      expect(decodeURIComponent(url)).toContain("attr_POOState='US-CO'");
      return new Response(
        JSON.stringify({
          features: [
            {
              attributes: {
                poly_IncidentName: "Example Fire",
                poly_FeatureCategory: "Wildfire Daily Fire Perimeter",
                poly_GISAcres: 123.45,
                poly_DateCurrent: 1776458283040,
                poly_IRWINID: "{IRWIN}",
                attr_IncidentName: "Example Fire",
                attr_UniqueFireIdentifier: "2026-CO-000001",
                attr_POOState: "US-CO",
                attr_POOCounty: "Test",
                attr_FinalAcres: 120,
                attr_PercentContained: 30,
                attr_FireCause: "Undetermined",
                attr_ModifiedOnDateTime_dt: 1777668673017,
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    expect(report.source.sourceId).toBe("nifc_wfigs");
    expect(report.perimeterCount).toBe(1);
    expect(report.perimeters[0].incidentName).toBe("Example Fire");
    expect(report.perimeters[0].state).toBe("US-CO");
    expect(report.perimeters[0].gisAcres).toBe(123.45);
    expect(report.caveats.join(" ")).toContain("not incident command");
  });
});
