import { describe, expect, test } from "vitest";
import { artifacts, productRoutes, products, sources, streams } from "../src/catalog.js";
import { buildMcpResourceCatalog, buildMcpToolCatalog } from "../src/interop.js";

describe("AOE MCP interoperability contracts", () => {
  test("builds read-only resource descriptors for public discovery surfaces", () => {
    const catalog = buildMcpResourceCatalog();
    expect(catalog.schemaId).toBe("aoe.mcp.resources.v1");
    expect(catalog.liveSettlementAllowed).toBe(false);
    expect(catalog.externalSideEffectsAllowed).toBe(false);
    expect(catalog.resources.length).toBe(products.length + sources.length + productRoutes.length + artifacts.length + streams.length);
    expect(catalog.resources).toContainEqual(
      expect.objectContaining({
        uri: "aoe://products/cyber_exploited_vuln_priority",
        mimeType: "application/json",
        x402Stream: true,
      }),
    );
    expect(catalog.resources).toContainEqual(
      expect.objectContaining({
        uri: "aoe://sources/cisa_kev",
        x402Stream: false,
      }),
    );
  });

  test("exposes only quote and preflight tools before paid-content MCP access", () => {
    const catalog = buildMcpToolCatalog();
    expect(catalog.schemaId).toBe("aoe.mcp.tools.v1");
    expect(catalog.liveSettlementAllowed).toBe(false);
    expect(catalog.externalSideEffectsAllowed).toBe(false);
    expect(catalog.tools.map((tool) => tool.name)).toEqual(["aoe_quote", "aoe_preflight"]);
    expect(catalog.tools.map((tool) => tool.name)).not.toContain("aoe_fetch_paid");
    for (const tool of catalog.tools) {
      expect(tool.access).toBe("public");
      expect(tool.liveSettlementAllowed).toBe(false);
      expect(tool.externalSideEffectsAllowed).toBe(false);
    }
  });
});

