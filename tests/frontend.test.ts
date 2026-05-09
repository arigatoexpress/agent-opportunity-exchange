import { describe, expect, test } from "vitest";
import { renderPublicFrontend } from "../src/frontend.js";

describe("public frontend", () => {
  test("hero buttons visibly drive the preview workbench", () => {
    const html = renderPublicFrontend();
    expect(html).toContain('id="workbench"');
    expect(html).toContain('data-action="cyber"');
    expect(html).toContain('data-action="wildfire"');
    expect(html).toContain('data-action="markets"');
    expect(html).toContain("scrollIntoView");
    expect(html).toContain("x402 Data Streams");
    expect(html).toContain("Separate Operational Lane");
  });

  test("ignores stale preview responses so clicks cannot be overwritten", () => {
    const html = renderPublicFrontend();
    expect(html).toContain("activePreviewRequest");
    expect(html).toContain("requestId === activePreviewRequest");
    expect(html).toContain("if (!userStartedPreview)");
  });
});
