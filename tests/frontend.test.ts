import { describe, expect, test } from "vitest";
import { renderPublicFrontend } from "../src/frontend.js";

describe("public frontend", () => {
  test("storefront buttons visibly drive the preview workbench", () => {
    const html = renderPublicFrontend();
    expect(html).toContain('id="workbench"');
    expect(html).toContain('data-action="cyber"');
    expect(html).toContain('data-action="wildfire"');
    expect(html).toContain('data-action="markets"');
    expect(html).toContain("scrollIntoView");
    expect(html).toContain("Market Data Streams");
    expect(html).toContain("API storefront");
    expect(html).toContain("Live stream workbench");
    expect(html).toContain("SEC + Macro Context");
    expect(html).toContain("/v1/streams/market-context/preview");
    expect(html).toContain("sapphirealpha.market_context.v1");
    expect(html).toContain("$1.0000");
    expect(html).toContain("Separate operational lane");
    expect(html).toContain("Wildfire routes are visible here only as a separate read-only public-safety research lane.");
    expect(html).toContain("No alert sends, flight authorization, drone operations, or incident command claims.");
  });

  test("ignores stale preview responses so clicks cannot be overwritten", () => {
    const html = renderPublicFrontend();
    expect(html).toContain("activePreviewRequest");
    expect(html).toContain("requestId === activePreviewRequest");
    expect(html).toContain("if (!userStartedPreview)");
  });
});
