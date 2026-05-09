import { describe, expect, test } from "vitest";
import { fetchWildfireAlerts } from "../src/adapters/wildfire.js";

describe("wildfire source adapter", () => {
  test("summarizes NWS alerts and flags wildfire relevance", async () => {
    const report = await fetchWildfireAlerts({ area: "CO" }, async (url) => {
      expect(url).toContain("area=CO");
      return new Response(
        JSON.stringify({
          features: [
            {
              id: "alert-1",
              properties: {
                event: "Red Flag Warning",
                headline: "Red Flag Warning issued for test area",
                severity: "Severe",
                urgency: "Expected",
                certainty: "Likely",
                effective: "2026-05-08T10:00:00Z",
                expires: "2026-05-08T20:00:00Z",
                areaDesc: "Test County",
                instruction: "Avoid outdoor burning.",
              },
            },
            {
              id: "alert-2",
              properties: {
                event: "Flood Watch",
                headline: "Flood Watch issued for test area",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    expect(report.source.sourceId).toBe("nws_alerts");
    expect(report.alertCount).toBe(2);
    expect(report.wildfireRelevantCount).toBe(1);
    expect(report.alerts[0].wildfireRelevant).toBe(true);
    expect(report.caveats.join(" ")).toContain("not an incident-command product");
  });
});
