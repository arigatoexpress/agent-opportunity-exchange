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
    expect(html).toContain("Evidence Streams");
    expect(html).toContain("Demo Guide");
    expect(html).toContain('href="/demo"');
    expect(html).toContain("Evidence storefront");
    expect(html).toContain("Live stream workbench");
    expect(html).toContain("Show buyers the proof before asking them to pay.");
    expect(html).toContain("Proof before purchase");
    expect(html).toContain("Buyer segment");
    expect(html).toContain("Evidence basis");
    expect(html).toContain("Inspect proof");
    expect(html).toContain("Show Contracts");
    expect(html).toContain('id="showContracts"');
    expect(html).toContain("inspectContracts");
    expect(html).toContain("/v1/contracts");
    expect(html).toContain("data-product-id");
    expect(html).toContain("inspectProduct('market_regime_evidence_pack'");
    expect(html).toContain("loadCatalog()");
    expect(html).not.toContain("loadProducts()");
    expect(html).toContain("Provenance and readiness");
    expect(html).toContain("Who has a reason to pay first");
    expect(html).toContain("Live SEC/FRED Upstream Proof");
    expect(html).toContain("/v1/streams/market-context/live-proof");
    expect(html).toContain("aoe.market_live_upstream_proof.v1");
    expect(html).toContain("mockDataUsed=false");
    expect(html).toContain("Mock data posture");
    expect(html).toContain('id="proofSummary"');
    expect(html).toContain("Evidence Hash");
    expect(html).toContain("Historical Claims");
    expect(html).toContain("ALFRED required");
    expect(html).toContain("Historical claims require ALFRED vintages.");
    expect(html).toContain("Live buyer proof must stay false.");
    expect(html).toContain("macro observations");
    expect(html).toContain("SEC + Macro Context");
    expect(html).toContain("/v1/streams/market-context/preview");
    expect(html).toContain("sapphirealpha.market_context.v1");
    expect(html).toContain("MSPs and SMB security");
    expect(html).toContain("Wildfire routes are visible here only as a separate read-only public-safety research lane.");
    expect(html).toContain("Retail/customer-facing assets, wildfire operations, and live settlement remain outside this storefront.");
  });

  test("renders the refactored buyer workbench shell", () => {
    const html = renderPublicFrontend();
    expect(html).toContain('class="workspace"');
    expect(html).toContain('class="rail"');
    expect(html).toContain('class="canvas"');
    expect(html).toContain('class="inspector"');
    expect(html).toContain('id="decisionLabel"');
    expect(html).toContain('id="decisionRoute"');
    expect(html).toContain("updateDecisionRail");
    expect(html).toContain("Evidence Streams buyer workbench");
    expect(html).not.toContain('class="first-screen"');
    expect(html).not.toContain('class="below"');
  });

  test("ignores stale preview responses so clicks cannot be overwritten", () => {
    const html = renderPublicFrontend();
    expect(html).toContain("activePreviewRequest");
    expect(html).toContain("requestId === activePreviewRequest");
    expect(html).toContain("if (!userStartedPreview)");
  });

  test("button outputs include route, request, value, provenance, and safety context", () => {
    const html = renderPublicFrontend();
    expect(html).toContain("buttonResult");
    expect(html).toContain("requestBody");
    expect(html).toContain("valueSignal");
    expect(html).toContain("public_preview_or_quote_only");
    expect(html).toContain("Inspect Featured Proof");
    expect(html).toContain("artifact preview and quote endpoints");
    expect(html).toContain("sourceEvidence");
    expect(html).toContain("/v1/sources");
    expect(html).toContain("/v1/artifacts/");
    expect(html).toContain("/quote");
    expect(html).toContain("Buyer contract bundle");
    expect(html).toContain("schemaCount");
  });

  test("surfaces disabled payment rail roadmap evidence for buyers", () => {
    const html = renderPublicFrontend();
    expect(html).toContain('id="paymentRailMap"');
    expect(html).toContain("x402 payment rail roadmap");
    expect(html).toContain("renderPaymentRailMap");
    expect(html).toContain("solana-pay-sh-svm-candidate");
    expect(html).toContain("Pay.sh / Solana provider catalog");
    expect(html).toContain("liveWalletsAllowed");
    expect(html).toContain("liveProviderCredentialsAllowed");
    expect(html).toContain("/v1/x402/status");
  });
});
