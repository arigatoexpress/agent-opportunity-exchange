import { describe, expect, test } from "vitest";
import {
  buildBanklessMcpManifest,
  buildCryptoResearchThesisReport,
  buildDefiReportInventory,
  fetchBanklessPodcastDigest,
} from "../src/adapters/crypto-research.js";

describe("crypto research adapter", () => {
  test("parses Bankless RSS into rights-bounded episode metadata", async () => {
    const digest = await fetchBanklessPodcastDigest(
      { query: "HYPE", limit: 2 },
      async () =>
        new Response(banklessRssFixture, {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }),
    );

    expect(digest.schemaId).toBe("aoe.bankless.podcast_digest.v1");
    expect(digest.source.rightsEnvelope).toBe("metadata_links_short_summaries_only");
    expect(digest.episodes).toHaveLength(1);
    expect(digest.episodes[0]).toEqual(
      expect.objectContaining({
        title: "HYPE, Perps, and Ethereum Market Structure",
        link: "https://example.com/hype",
        topicTags: expect.arrayContaining(["ethereum", "defi", "investing"]),
      }),
    );
    expect(digest.episodes[0].recordHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(digest.caveats.join(" ")).toContain("not a transcript reseller");
  });

  test("builds a non-advisory thesis packet from public market, podcast, and DeFi data", async () => {
    const report = await buildCryptoResearchThesisReport(
      {
        assetSymbol: "HYPE",
        coingeckoId: "hyperliquid",
        protocolSlug: "hyperliquid-perps",
        banklessQuery: "HYPE",
        days: 30,
        includeLandscape: false,
      },
      mockCryptoFetch,
    );

    expect(report.schemaId).toBe("aoe.crypto_research_thesis.v1");
    expect(report.productId).toBe("crypto_research_thesis_pack");
    expect(report.query).toMatchObject({ assetSymbol: "HYPE", coingeckoId: "hyperliquid", protocolSlug: "hyperliquid-perps" });
    expect(report.market.technicals.sampleDays).toBe(31);
    expect(report.market.technicals.periodReturnPct).toBeGreaterThan(0);
    expect(report.fundamentals.protocol?.latestTvlUsd).toBe(160);
    expect(report.fundamentals.protocol?.tvlChange30dPct).toBe(60);
    expect(report.fundamentals.fees?.total30dUsd).toBe(30);
    expect(report.fundamentals.fees?.feesToTvl30dPct).toBe(18.75);
    expect(report.bankless.episodes[0].title).toContain("HYPE");
    expect(report.defiReportInventory.count).toBeGreaterThan(10);
    expect(report.banklessMcp.status).toBe("token_required");
    expect(report.evidenceMatrix.map((card) => card.lens)).toContain("business_model_value_accrual");
    expect(report.evidenceProof.reportHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(report.caveats.join(" ")).toContain("not investment advice");
    expect(report.caveats.join(" ")).toContain("No buy, sell, hold");
  });

  test("exposes source-rights guardrails for Bankless MCP and DeFi Report inventory", () => {
    const manifest = buildBanklessMcpManifest();
    const inventory = buildDefiReportInventory();

    expect(manifest.package).toBe("@bankless/onchain-mcp");
    expect(manifest.liveCallsEnabled).toBe(false);
    expect(manifest.requiredEnv).toEqual(["BANKLESS_API_TOKEN"]);
    expect(inventory.siteConstraint).toContain("no paywall or anti-bot bypass");
    expect(inventory.outputPolicy.join(" ")).toContain("Do not republish full articles");
  });
});

async function mockCryptoFetch(url: string): Promise<Response> {
  if (url.includes("feeds.redcircle.com")) {
    return new Response(banklessRssFixture, { status: 200, headers: { "Content-Type": "text/xml" } });
  }
  if (url.includes("/coins/markets")) {
    return jsonResponse([
      {
        id: "hyperliquid",
        symbol: "hype",
        name: "Hyperliquid",
        current_price: 130,
        market_cap: 1_300_000_000,
        total_volume: 80_000_000,
        circulating_supply: 10_000_000,
        total_supply: 10_000_000,
        price_change_percentage_24h_in_currency: 2,
        price_change_percentage_7d_in_currency: 8,
        price_change_percentage_30d_in_currency: 30,
        price_change_percentage_1y_in_currency: 120,
      },
    ]);
  }
  if (url.includes("/market_chart")) {
    return jsonResponse({
      prices: Array.from({ length: 31 }, (_, index) => [1770000000000 + index * 86_400_000, 100 + index]),
      total_volumes: Array.from({ length: 31 }, (_, index) => [1770000000000 + index * 86_400_000, 1_000_000 + index * 10_000]),
    });
  }
  if (url.includes("/protocol/hyperliquid-perps")) {
    return jsonResponse({
      name: "Hyperliquid Perps",
      category: "Derivatives",
      chain: "Hyperliquid L1",
      chains: ["Hyperliquid L1"],
      tvl: [
        { date: 1770000000, totalLiquidityUSD: 100 },
        { date: 1772592000, totalLiquidityUSD: 160 },
      ],
    });
  }
  if (url.includes("/summary/fees/hyperliquid-perps")) {
    return jsonResponse({
      name: "Hyperliquid Perps",
      total24h: 2,
      total7d: 10,
      total30d: 30,
      totalAllTime: 300,
      change_1d: 4,
    });
  }
  throw new Error(`Unexpected URL ${url}`);
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const banklessRssFixture = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Bankless</title>
    <item>
      <itunes:title>HYPE, Perps, and Ethereum Market Structure</itunes:title>
      <itunes:summary><![CDATA[<p>Ethereum liquidity, DeFi perps, HYPE valuation, and market cycle risk.</p>]]></itunes:summary>
      <link>https://example.com/hype</link>
      <pubDate>Wed, 14 May 2026 09:00:00 +0000</pubDate>
      <itunes:duration>3600</itunes:duration>
    </item>
    <item>
      <itunes:title>Unrelated AI Roundtable</itunes:title>
      <itunes:summary>AI infrastructure and policy.</itunes:summary>
      <link>https://example.com/ai</link>
      <pubDate>Tue, 13 May 2026 09:00:00 +0000</pubDate>
      <itunes:duration>1800</itunes:duration>
    </item>
  </channel>
</rss>`;
