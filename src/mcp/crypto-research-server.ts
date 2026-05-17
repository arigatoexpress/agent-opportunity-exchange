import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  buildBanklessMcpManifest,
  buildCryptoResearchThesisReport,
  buildDefiReportInventory,
  fetchBanklessPodcastDigest,
} from "../adapters/crypto-research.js";

const server = new McpServer({
  name: "agent-opportunity-crypto-research",
  version: "0.1.0",
});

server.registerTool(
  "bankless_mcp_manifest",
  {
    title: "Bankless MCP Manifest",
    description: "Return the optional Bankless Onchain MCP configuration and safety posture.",
    inputSchema: {},
    annotations: { readOnlyHint: true, idempotentHint: true },
  },
  async () => jsonToolResult(buildBanklessMcpManifest()),
);

server.registerTool(
  "defi_report_public_inventory",
  {
    title: "DeFi Report Public Inventory",
    description: "Return public metadata and methodology tags for The DeFi Report-inspired crypto research.",
    inputSchema: {},
    annotations: { readOnlyHint: true, idempotentHint: true },
  },
  async () => jsonToolResult(buildDefiReportInventory()),
);

server.registerTool(
  "bankless_recent_podcast",
  {
    title: "Bankless Recent Podcast",
    description: "Filter public Bankless RSS metadata into short source-linked episode context.",
    inputSchema: {
      query: z.string().min(1).max(80).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => jsonToolResult(await fetchBanklessPodcastDigest(args)),
);

server.registerTool(
  "crypto_research_thesis",
  {
    title: "Crypto Research Thesis",
    description: "Generate a non-advisory crypto thesis packet from Bankless RSS, DeFi Report public methodology, CoinGecko, and DeFiLlama.",
    inputSchema: {
      assetSymbol: z.string().min(1).max(16),
      coingeckoId: z.string().min(1).max(80),
      protocolSlug: z.string().min(1).max(100).optional(),
      banklessQuery: z.string().min(1).max(80).optional(),
      days: z.number().int().min(30).max(365).optional(),
      includeLandscape: z.boolean().optional(),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => jsonToolResult(await buildCryptoResearchThesisReport(args)),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AOE crypto research MCP server running on stdio");
}

function jsonToolResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
