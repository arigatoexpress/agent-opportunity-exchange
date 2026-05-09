import { artifacts, productRoutes, products, sources, streams } from "./catalog.js";

export interface McpResourceDescriptor {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: "application/json";
  route?: string;
  x402Stream?: boolean;
  sourceIds?: string[];
}

export interface McpToolDescriptor {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchemaId: string;
  access: "public" | "simulated_x402_payment";
  liveSettlementAllowed: false;
  externalSideEffectsAllowed: false;
}

export function buildMcpResourceCatalog() {
  return {
    schemaId: "aoe.mcp.resources.v1",
    liveSettlementAllowed: false,
    externalSideEffectsAllowed: false,
    resources: [
      ...products.map((product): McpResourceDescriptor => ({
        uri: `aoe://products/${product.productId}`,
        name: `product.${product.productId}`,
        title: product.title,
        description: product.buyerValue,
        mimeType: "application/json",
        route: product.route,
        x402Stream: product.x402Stream,
        sourceIds: product.sourceIds,
      })),
      ...sources.map((source): McpResourceDescriptor => ({
        uri: `aoe://sources/${source.sourceId}`,
        name: `source.${source.sourceId}`,
        title: source.name,
        description: source.notes,
        mimeType: "application/json",
        x402Stream: false,
        sourceIds: [source.sourceId],
      })),
      ...productRoutes.map((route): McpResourceDescriptor => ({
        uri: `aoe://routes/${route.routeId}`,
        name: `route.${route.routeId}`,
        title: `${route.method} ${route.route}`,
        description: route.value,
        mimeType: "application/json",
        route: route.route,
        x402Stream: route.x402Stream,
        sourceIds: route.sourceIds,
      })),
      ...artifacts.map((artifact): McpResourceDescriptor => ({
        uri: `aoe://artifacts/${artifact.artifactId}`,
        name: `artifact.${artifact.artifactId}`,
        title: artifact.title,
        description: artifact.description,
        mimeType: "application/json",
        route: `/v1/artifacts/${artifact.artifactId}/preview`,
        x402Stream: artifact.x402Stream,
        sourceIds: artifact.sourceIds,
      })),
      ...streams.map((stream): McpResourceDescriptor => ({
        uri: `aoe://streams/${stream.streamId}`,
        name: `stream.${stream.streamId}`,
        title: stream.title,
        description: stream.outputSummary,
        mimeType: "application/json",
        route: stream.route,
        x402Stream: stream.x402Stream,
        sourceIds: stream.sourceIds,
      })),
    ],
  };
}

export function buildMcpToolCatalog() {
  const artifactIdSchema = {
    type: "object",
    additionalProperties: false,
    required: ["artifactId"],
    properties: {
      artifactId: {
        type: "string",
        minLength: 1,
      },
    },
  };

  return {
    schemaId: "aoe.mcp.tools.v1",
    liveSettlementAllowed: false,
    externalSideEffectsAllowed: false,
    tools: [
      {
        name: "aoe_quote",
        title: "Quote AOE artifact",
        description: "Return price, rights, source ids, and simulated/testnet payment requirement context for an artifact.",
        inputSchema: artifactIdSchema,
        outputSchemaId: "aoe.artifact.quote.v1",
        access: "public",
        liveSettlementAllowed: false,
        externalSideEffectsAllowed: false,
      },
      {
        name: "aoe_preflight",
        title: "Preflight AOE artifact access",
        description: "Check product, source, policy, and safety boundaries before attempting paid artifact access.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          required: ["productId", "intendedUse"],
          properties: {
            productId: { type: "string", minLength: 1 },
            intendedUse: { type: "string", minLength: 1 },
            artifactId: { type: "string" },
            sourceIds: { type: "array", items: { type: "string" } },
          },
        },
        outputSchemaId: "aoe.access.preflight.v1",
        access: "public",
        liveSettlementAllowed: false,
        externalSideEffectsAllowed: false,
      },
    ] satisfies McpToolDescriptor[],
  };
}

