import { describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import { productRoutes, products, sources } from "../src/catalog.js";
import { buildContractBundle, buildSchemaCatalog, CONTRACT_BUNDLE_SCHEMA_ID } from "../src/contracts.js";

describe("buyer contract bundle", () => {
  test("covers every product and route schema without enabling live settlement", () => {
    const bundle = buildContractBundle(new Date("2026-05-10T10:25:23.145Z"));
    expect(bundle.schemaId).toBe(CONTRACT_BUNDLE_SCHEMA_ID);
    expect(bundle.liveSettlementAllowed).toBe(false);
    expect(bundle.externalSideEffectsAllowed).toBe(false);
    expect(bundle.paymentBoundary.liveSettlementAllowed).toBe(false);
    expect(bundle.paymentBoundary.mainnetAllowed).toBe(false);
    expect(bundle.paymentBoundary.acceptedTestnet).toBe("eip155:84532");
    expect(bundle.paymentBoundary.rails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ railId: "base-sepolia-official-x402", runtime: "evm" }),
        expect.objectContaining({
          railId: "solana-pay-sh-svm-candidate",
          runtime: "svm",
          status: "planned_simulated_only",
          liveSettlementAllowed: false,
        }),
      ]),
    );
    expect(bundle.paymentBoundary.paySh).toEqual(
      expect.objectContaining({
        providerCatalogPlanned: true,
        liveWalletsAllowed: false,
        liveProviderCredentialsAllowed: false,
      }),
    );
    expect(bundle.rightsBoundary.principle).toBe("payment_is_not_permission");
    expect(bundle.coverage.buyerDiscoveryReady).toBe(true);
    expect(bundle.coverage.routeSchemasCovered).toBe(true);
    expect(bundle.coverage.productSchemasCovered).toBe(true);
    expect(bundle.coverage.sources).toBe(sources.length);

    for (const route of productRoutes) {
      expect(bundle.schemaCatalog[route.schemaId]).toBeTruthy();
      expect(bundle.pathContracts).toContainEqual(
        expect.objectContaining({
          routeId: route.routeId,
          path: route.route,
          method: route.method,
          schemaId: route.schemaId,
          liveSettlementAllowed: false,
          externalSideEffectsAllowed: false,
        }),
      );
    }

    for (const product of products) {
      expect(bundle.schemaCatalog[product.schemaId]).toBeTruthy();
    }
  });

  test("exports OpenAPI paths with x402 and source-rights extensions", () => {
    const bundle = buildContractBundle();
    const paidContent = bundle.openapi.paths["/v1/artifacts/{id}/content"].get;
    expect(paidContent.operationId).toBe("artifact_paid_content");
    expect(paidContent["x-aoe"]).toEqual(
      expect.objectContaining({
        access: "simulated_x402_payment",
        liveSettlementAllowed: false,
        externalSideEffectsAllowed: false,
      }),
    );
    expect(paidContent.responses["402"]?.description).toContain("x402 payment required");
    expect(bundle.openapi.components.schemas["aoe.payment.required.v1"]).toBeTruthy();
  });

  test("schema catalog exposes reusable public discovery contracts", () => {
    const schemas = buildSchemaCatalog();
    expect(schemas[CONTRACT_BUNDLE_SCHEMA_ID]).toBeTruthy();
    expect(schemas["aoe.discovery.products.v1"]).toBeTruthy();
    expect(schemas["aoe.discovery.routes.v1"]).toBeTruthy();
    expect(schemas["aoe.x402.status.v1"]).toBeTruthy();
    expect(schemas["sapphirealpha.market_context.v1"]).toBeTruthy();
  });

  test("contract endpoint is public and listed in well-known discovery", async () => {
    const app = createApp();
    const res = await app.request("/v1/contracts");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schemaId).toBe(CONTRACT_BUNDLE_SCHEMA_ID);
    expect(body.coverage.buyerDiscoveryReady).toBe(true);
    expect(body.coverage.routeSchemasCovered).toBe(true);
    expect(body.coverage.productSchemasCovered).toBe(true);

    const wellKnownRes = await app.request("/.well-known/agent-opportunity-exchange.json");
    const wellKnown = await wellKnownRes.json();
    expect(wellKnown.contractBundle).toBe("/v1/contracts");
    expect(wellKnown.freeEndpoints).toContain("/v1/contracts");
    expect(wellKnown.schemaIds.contractBundle).toBe(CONTRACT_BUNDLE_SCHEMA_ID);
  });
});
