import { XMLParser } from "fast-xml-parser";
import { sha256 } from "../hash.js";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const BANKLESS_RSS_URL = "https://feeds.redcircle.com/74980a9e-4089-4a19-bbcb-b13d5b56f37d";
const COINGECKO_API_ROOT = "https://api.coingecko.com/api/v3";
const DEFILLAMA_API_ROOT = "https://api.llama.fi";
const STABLECOINS_LLAMA_ROOT = "https://stablecoins.llama.fi";

export interface BanklessPodcastRequest {
  query?: string;
  limit?: number;
  timeoutMs?: number;
}

export interface BanklessEpisode {
  title: string;
  publishedAt: string | null;
  durationSeconds: number | null;
  link: string | null;
  summary: string;
  topicTags: string[];
  sourceUrl: string;
  recordHash: string;
}

export interface BanklessPodcastDigest {
  schemaId: "aoe.bankless.podcast_digest.v1";
  generatedAt: string;
  source: {
    sourceId: "bankless_podcast_rss";
    owner: "Bankless";
    url: string;
    retrievalMode: "public_rss_metadata";
    rightsEnvelope: "metadata_links_short_summaries_only";
    outputPolicy: string[];
  };
  query: {
    query: string | null;
    limit: number;
  };
  episodes: BanklessEpisode[];
  caveats: string[];
}

export interface CryptoThesisRequest {
  assetSymbol: string;
  coingeckoId: string;
  protocolSlug?: string;
  banklessQuery?: string;
  days?: number;
  includeLandscape?: boolean;
  timeoutMs?: number;
}

export interface CryptoThesisReport {
  schemaId: "aoe.crypto_research_thesis.v1";
  generatedAt: string;
  mode: "read_only_public_research";
  x402Stream: true;
  productId: "crypto_research_thesis_pack";
  query: Required<Pick<CryptoThesisRequest, "assetSymbol" | "coingeckoId" | "days" | "includeLandscape">> & {
    protocolSlug: string | null;
    banklessQuery: string | null;
  };
  sourceRights: Array<{
    sourceId: string;
    url: string;
    retrievalMode: string;
    outputPolicy: string;
  }>;
  methodology: ReturnType<typeof buildNadeauInspiredMethodology>;
  defiReportInventory: ReturnType<typeof buildDefiReportInventory>;
  banklessMcp: ReturnType<typeof buildBanklessMcpManifest>;
  bankless: BanklessPodcastDigest;
  market: {
    sourceId: "coingecko";
    current: Record<string, unknown>;
    technicals: TechnicalSnapshot;
  };
  fundamentals: {
    sourceId: "defillama";
    protocol: ProtocolSnapshot | null;
    fees: FeesSnapshot | null;
    landscape: LandscapeSnapshot | null;
  };
  evidenceMatrix: EvidenceCard[];
  scoring: {
    fundamentalsScore: number | null;
    technicalScore: number | null;
    narrativeScore: number;
    evidenceCompleteness: number;
    notes: string[];
  };
  researchQuestions: string[];
  caveats: string[];
  evidenceProof: {
    algorithm: "sha256";
    canonicalization: "stable-json-sorted-keys-v1";
    reportHash: string;
    sourceRecordHashes: string[];
  };
}

interface TechnicalSnapshot {
  firstPriceUsd: number | null;
  latestPriceUsd: number | null;
  periodReturnPct: number | null;
  drawdownFromPeriodHighPct: number | null;
  movingAveragesUsd: {
    ma30: number | null;
    ma90: number | null;
    ma200: number | null;
  };
  latestVsMovingAveragesPct: {
    ma30: number | null;
    ma90: number | null;
    ma200: number | null;
  };
  rsi14: number | null;
  latestVolumeUsd: number | null;
  averageVolume30dUsd: number | null;
  latestVolumeVs30dAvgPct: number | null;
  sampleDays: number;
}

interface ProtocolSnapshot {
  name: string | null;
  slug: string;
  category: string | null;
  chain: string | null;
  chains: string[];
  latestTvlUsd: number | null;
  tvlChange30dPct: number | null;
  sampleDays: number;
  recordHash: string;
}

interface FeesSnapshot {
  name: string | null;
  total24hUsd: number | null;
  total7dUsd: number | null;
  total30dUsd: number | null;
  totalAllTimeUsd: number | null;
  change1dPct: number | null;
  annualizedFeesRunRateUsd: number | null;
  feesToTvl30dPct: number | null;
  recordHash: string;
}

interface LandscapeSnapshot {
  dexVolume24hUsd: number | null;
  dexVolume7dUsd: number | null;
  dexVolume30dUsd: number | null;
  stablecoinSupplyUsd: number | null;
  stablecoinAssetCount: number | null;
  recordHash: string;
}

interface EvidenceCard {
  lens: string;
  signal: "supportive" | "mixed" | "weak" | "missing";
  finding: string;
  metrics: Record<string, number | string | null>;
  sourceIds: string[];
  nextQuestion: string;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "__cdata",
  trimValues: true,
});

export function buildBanklessMcpManifest() {
  const configured = Boolean(process.env.BANKLESS_API_TOKEN);
  return {
    schemaId: "aoe.bankless_mcp.manifest.v1",
    generatedAt: new Date().toISOString(),
    sourceId: "bankless_onchain_mcp",
    status: configured ? "token_configured" : "token_required",
    liveCallsEnabled: configured,
    package: "@bankless/onchain-mcp",
    packageVersionPinned: "1.0.6",
    installMode: "optional_external_npx",
    command: "npx",
    args: ["-y", "@bankless/onchain-mcp@1.0.6"],
    requiredEnv: ["BANKLESS_API_TOKEN"],
    toolsDocumented: [
      "read_contract",
      "get_proxy",
      "get_abi",
      "get_source",
      "get_events",
      "build_event_topic",
      "get_transaction_history",
      "get_transaction_info",
    ],
    notes: [
      "Bankless documents the Onchain MCP as a beta service requiring a Citizen API token for live calls.",
      "This AOE app does not store or echo the token and does not bundle the Bankless package because the published package currently pins an older MCP SDK with advisories.",
      "Use the MCP as optional onchain enrichment after a user supplies a token in their own MCP client configuration.",
    ],
  } as const;
}

export function buildDefiReportInventory() {
  const reports = DEFI_REPORT_PUBLIC_INVENTORY;
  const methodTagCounts = reports.reduce<Record<string, number>>((acc, report) => {
    for (const tag of report.methodTags) acc[tag] = (acc[tag] ?? 0) + 1;
    return acc;
  }, {});
  return {
    schemaId: "aoe.defi_report.public_inventory.v1",
    generatedAt: new Date().toISOString(),
    sourceId: "the_defi_report_public_metadata",
    owner: "The DeFi Report / Michael Nadeau",
    inventoryMode: "public_search_index_plus_user_browser_tab_metadata",
    siteConstraint: "Direct headless fetches encountered a Vercel browser checkpoint; no paywall or anti-bot bypass is used.",
    reports,
    count: reports.length,
    methodTagCounts,
    extractedMethodology: buildNadeauInspiredMethodology(),
    outputPolicy: [
      "Use titles, dates, topics, public URLs, and high-level methodology tags only.",
      "Do not republish full articles, gated reports, screenshots, charts, tables, or subscriber-only text.",
      "Derived reports must cite links and use independent public market/onchain data for current metrics.",
    ],
  };
}

export function buildNadeauInspiredMethodology() {
  return {
    name: "Nadeau-inspired public crypto research method",
    nonImpersonation: "Inspired by public report structure and topics; not authored by or affiliated with Michael Nadeau, The DeFi Report, or Bankless.",
    lenses: [
      {
        lensId: "macro_liquidity_cycle",
        label: "Macro and liquidity cycle",
        dataNeeded: ["rates", "inflation", "liquidity", "risk-asset trend", "stablecoin supply"],
        question: "Is the regime risk-on, risk-off, mid-cycle, late-cycle, or transitionary?",
      },
      {
        lensId: "market_structure_technicals",
        label: "Market structure and technicals",
        dataNeeded: ["spot price", "volume", "200d moving average", "drawdown", "RSI", "ETF or flow proxies where licensed"],
        question: "Is price confirming the thesis or signaling fragility?",
      },
      {
        lensId: "onchain_fundamentals",
        label: "Onchain fundamentals",
        dataNeeded: ["TVL", "fees", "revenue", "DEX/perp volume", "stablecoin flows", "active usage"],
        question: "Is the network/protocol producing measurable economic activity?",
      },
      {
        lensId: "business_model_value_accrual",
        label: "Business model and value accrual",
        dataNeeded: ["revenue lines", "operating costs", "token sinks", "supply schedule", "cash flows", "comparable valuation"],
        question: "Who captures value: token holders, equity holders, users, validators, or another layer?",
      },
      {
        lensId: "competitive_positioning",
        label: "Competition and addressable market",
        dataNeeded: ["category peers", "market size", "switching costs", "distribution", "ecosystem capital"],
        question: "Is the project gaining durable share in a large enough market?",
      },
      {
        lensId: "risk_and_portfolio_construction",
        label: "Risk and portfolio construction",
        dataNeeded: ["regulatory risk", "centralization", "liquidity", "unlock schedule", "narrative concentration", "scenario analysis"],
        question: "What would break the thesis, and how should research uncertainty be sized?",
      },
    ],
  };
}

export async function fetchBanklessPodcastDigest(
  request: BanklessPodcastRequest = {},
  fetcher: FetchLike = fetch,
): Promise<BanklessPodcastDigest> {
  const limit = clampInt(request.limit ?? 10, 1, 50);
  const query = request.query?.trim() || null;
  const response = await fetchWithTimeout(BANKLESS_RSS_URL, request.timeoutMs, fetcher);
  if (!response.ok) throw new Error(`Bankless RSS request failed: ${response.status}`);
  const xml = await response.text();
  const parsed = xmlParser.parse(xml) as RssDocument;
  const rawItems = toArray(parsed.rss?.channel?.item);
  const normalizedQuery = query?.toLowerCase();
  const episodes = rawItems
    .map(normalizeBanklessEpisode)
    .filter((episode) => {
      if (!normalizedQuery) return true;
      return [episode.title, episode.summary, episode.topicTags.join(" ")].join(" ").toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""))
    .slice(0, limit);

  return {
    schemaId: "aoe.bankless.podcast_digest.v1",
    generatedAt: new Date().toISOString(),
    source: {
      sourceId: "bankless_podcast_rss",
      owner: "Bankless",
      url: BANKLESS_RSS_URL,
      retrievalMode: "public_rss_metadata",
      rightsEnvelope: "metadata_links_short_summaries_only",
      outputPolicy: [
        "Use episode metadata, public links, timestamps, and short summaries only.",
        "Do not download or redistribute audio.",
        "Do not treat sponsor copy as independent market evidence.",
      ],
    },
    query: { query, limit },
    episodes,
    caveats: [
      "Bankless RSS is all-rights-reserved podcast metadata; this digest is a source-linked index, not a transcript reseller.",
      "Episode descriptions can include sponsor copy and should be separated from analytical claims.",
    ],
  };
}

export async function buildCryptoResearchThesisReport(
  request: CryptoThesisRequest,
  fetcher: FetchLike = fetch,
): Promise<CryptoThesisReport> {
  const normalized = normalizeThesisRequest(request);
  const boundedFetcher = (url: string, init?: RequestInit) => fetchWithTimeout(url, normalized.timeoutMs, fetcher, init);
  const encodedCoinId = encodeURIComponent(normalized.coingeckoId);
  const marketUrl = `${COINGECKO_API_ROOT}/coins/markets?vs_currency=usd&ids=${encodedCoinId}&price_change_percentage=24h,7d,30d,1y`;
  const chartUrl = `${COINGECKO_API_ROOT}/coins/${encodedCoinId}/market_chart?vs_currency=usd&days=${normalized.days}&interval=daily`;
  const banklessQuery = normalized.banklessQuery ?? normalized.assetSymbol;

  const protocolPromise = normalized.protocolSlug ? fetchProtocolSnapshot(normalized.protocolSlug, boundedFetcher) : Promise.resolve(null);
  const feesPromise = normalized.protocolSlug ? fetchFeesSnapshot(normalized.protocolSlug, boundedFetcher) : Promise.resolve(null);
  const landscapePromise = normalized.includeLandscape ? fetchLandscapeSnapshot(boundedFetcher) : Promise.resolve(null);

  const [marketResponse, chartResponse, bankless, protocol, rawFees, landscape] = await Promise.all([
    fetchJson<CoingeckoMarketRow[]>(marketUrl, boundedFetcher),
    fetchJson<CoingeckoMarketChart>(chartUrl, boundedFetcher),
    fetchBanklessPodcastDigest({ query: banklessQuery, limit: 6, timeoutMs: normalized.timeoutMs }, boundedFetcher),
    protocolPromise,
    feesPromise,
    landscapePromise,
  ]);
  const fees =
    rawFees && protocol?.latestTvlUsd && rawFees.total30dUsd
      ? {
          ...rawFees,
          feesToTvl30dPct: round((rawFees.total30dUsd / protocol.latestTvlUsd) * 100),
          recordHash: sha256({ ...rawFees, feesToTvl30dPct: round((rawFees.total30dUsd / protocol.latestTvlUsd) * 100) }),
        }
      : rawFees;

  const current = marketResponse[0] ?? {};
  const technicals = buildTechnicals(chartResponse);
  const methodology = buildNadeauInspiredMethodology();
  const defiReportInventory = buildDefiReportInventory();
  const banklessMcp = buildBanklessMcpManifest();
  const evidenceMatrix = buildEvidenceMatrix({
    current,
    technicals,
    protocol,
    fees,
    landscape,
    bankless,
    assetSymbol: normalized.assetSymbol,
  });
  const scoring = scoreEvidence({ technicals, protocol, fees, bankless, evidenceMatrix });
  const sourceRecordHashes = [
    sha256(current),
    sha256(technicals),
    ...(protocol ? [protocol.recordHash] : []),
    ...(fees ? [fees.recordHash] : []),
    ...(landscape ? [landscape.recordHash] : []),
    ...bankless.episodes.map((episode) => episode.recordHash),
  ];

  const reportWithoutProof = {
    schemaId: "aoe.crypto_research_thesis.v1" as const,
    generatedAt: new Date().toISOString(),
    mode: "read_only_public_research" as const,
    x402Stream: true as const,
    productId: "crypto_research_thesis_pack" as const,
    query: {
      assetSymbol: normalized.assetSymbol,
      coingeckoId: normalized.coingeckoId,
      protocolSlug: normalized.protocolSlug ?? null,
      banklessQuery,
      days: normalized.days,
      includeLandscape: normalized.includeLandscape,
    },
    sourceRights: [
      {
        sourceId: "the_defi_report_public_metadata",
        url: "https://thedefireport.io/research",
        retrievalMode: "public metadata inventory",
        outputPolicy: "methodology tags and links only; no full-text republication",
      },
      {
        sourceId: "bankless_podcast_rss",
        url: BANKLESS_RSS_URL,
        retrievalMode: "public RSS metadata",
        outputPolicy: "episode metadata and short summaries only",
      },
      {
        sourceId: "bankless_onchain_mcp",
        url: "https://docs.bankless.com/bankless-api/other-services/onchain-mcp",
        retrievalMode: "optional user-configured MCP",
        outputPolicy: "live onchain calls require user-owned Bankless API token",
      },
      {
        sourceId: "coingecko",
        url: COINGECKO_API_ROOT,
        retrievalMode: "keyless public API",
        outputPolicy: "respect rate limits and provider terms; derived metrics only",
      },
      {
        sourceId: "defillama",
        url: DEFILLAMA_API_ROOT,
        retrievalMode: "public API",
        outputPolicy: "source-cited derived metrics only",
      },
    ],
    methodology,
    defiReportInventory,
    banklessMcp,
    bankless,
    market: {
      sourceId: "coingecko" as const,
      current,
      technicals,
    },
    fundamentals: {
      sourceId: "defillama" as const,
      protocol,
      fees,
      landscape,
    },
    evidenceMatrix,
    scoring,
    researchQuestions: buildResearchQuestions(normalized.assetSymbol, protocol, fees, technicals),
    caveats: [
      "Research and education only; not investment advice.",
      "No buy, sell, hold, price-target, portfolio-personalized, trading, wallet-signing, or order-execution output is provided.",
      "The DeFi Report layer uses public metadata and methodology inspiration only; source text, charts, and gated materials are not copied.",
      "CoinGecko keyless and DeFiLlama public endpoints can rate-limit, revise, or change schemas; verify before publication or resale.",
      "Bankless Onchain MCP calls are optional and require a user-owned Bankless API token configured outside this server.",
    ],
  };

  return {
    ...reportWithoutProof,
    evidenceProof: {
      algorithm: "sha256",
      canonicalization: "stable-json-sorted-keys-v1",
      reportHash: sha256({ ...reportWithoutProof, sourceRecordHashes }),
      sourceRecordHashes,
    },
  };
}

function normalizeThesisRequest(request: CryptoThesisRequest) {
  return {
    assetSymbol: request.assetSymbol.trim().toUpperCase(),
    coingeckoId: request.coingeckoId.trim().toLowerCase(),
    protocolSlug: request.protocolSlug?.trim().toLowerCase() || undefined,
    banklessQuery: request.banklessQuery?.trim() || undefined,
    days: clampInt(request.days ?? 180, 30, 365),
    includeLandscape: request.includeLandscape ?? true,
    timeoutMs: normalizeTimeoutMs(request.timeoutMs),
  };
}

async function fetchJson<T>(url: string, fetcher: FetchLike): Promise<T> {
  const response = await fetcher(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${sourceLabel(url)} request failed: ${response.status}`);
  return (await response.json()) as T;
}

async function fetchWithTimeout(url: string, timeoutMs: number | undefined, fetcher: FetchLike, init: RequestInit = {}): Promise<Response> {
  const bounded = normalizeTimeoutMs(timeoutMs);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), bounded);
  try {
    return await fetcher(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`${sourceLabel(url)} request timed out after ${bounded}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchProtocolSnapshot(protocolSlug: string, fetcher: FetchLike): Promise<ProtocolSnapshot | null> {
  const data = await fetchJson<DefiLlamaProtocol>(`${DEFILLAMA_API_ROOT}/protocol/${encodeURIComponent(protocolSlug)}`, fetcher);
  const tvlRows = toArray(data.tvl);
  const latestTvlUsd = latestNumber(tvlRows.map((row) => row.totalLiquidityUSD));
  const latestDate = tvlRows.at(-1)?.date ?? null;
  const thirtyDaysAgo = latestDate ? latestDate - 30 * 86_400 : null;
  const previous = thirtyDaysAgo ? [...tvlRows].reverse().find((row) => typeof row.date === "number" && row.date <= thirtyDaysAgo)?.totalLiquidityUSD ?? null : null;
  const snapshot: Omit<ProtocolSnapshot, "recordHash"> = {
    name: data.name ?? null,
    slug: protocolSlug,
    category: data.category ?? null,
    chain: data.chain ?? null,
    chains: toArray(data.chains).filter((chain): chain is string => typeof chain === "string"),
    latestTvlUsd,
    tvlChange30dPct: pctChange(previous, latestTvlUsd),
    sampleDays: tvlRows.length,
  };
  return { ...snapshot, recordHash: sha256(snapshot) };
}

async function fetchFeesSnapshot(protocolSlug: string, fetcher: FetchLike): Promise<FeesSnapshot | null> {
  const data = await fetchJson<DefiLlamaFees>(`${DEFILLAMA_API_ROOT}/summary/fees/${encodeURIComponent(protocolSlug)}?dataType=dailyFees`, fetcher);
  const snapshot: Omit<FeesSnapshot, "feesToTvl30dPct" | "recordHash"> = {
    name: data.name ?? null,
    total24hUsd: numberOrNull(data.total24h),
    total7dUsd: numberOrNull(data.total7d),
    total30dUsd: numberOrNull(data.total30d),
    totalAllTimeUsd: numberOrNull(data.totalAllTime),
    change1dPct: numberOrNull(data.change_1d),
    annualizedFeesRunRateUsd: data.total30d ? data.total30d * (365 / 30) : null,
  };
  const withRatio: Omit<FeesSnapshot, "recordHash"> = {
    ...snapshot,
    feesToTvl30dPct: null,
  };
  return { ...withRatio, recordHash: sha256(withRatio) };
}

async function fetchLandscapeSnapshot(fetcher: FetchLike): Promise<LandscapeSnapshot | null> {
  const [dex, stablecoins] = await Promise.all([
    fetchJson<DefiLlamaOverview>(`${DEFILLAMA_API_ROOT}/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`, fetcher),
    fetchJson<StablecoinOverview>(`${STABLECOINS_LLAMA_ROOT}/stablecoins?includePrices=true`, fetcher),
  ]);
  const stablecoinSupplyUsd = toArray(stablecoins.peggedAssets)
    .map((asset) => numberOrNull(asset.circulating?.peggedUSD))
    .filter((value): value is number => value !== null)
    .reduce((sum, value) => sum + value, 0);
  const snapshot: Omit<LandscapeSnapshot, "recordHash"> = {
    dexVolume24hUsd: numberOrNull(dex.total24h),
    dexVolume7dUsd: numberOrNull(dex.total7d),
    dexVolume30dUsd: numberOrNull(dex.total30d),
    stablecoinSupplyUsd,
    stablecoinAssetCount: toArray(stablecoins.peggedAssets).length,
  };
  return { ...snapshot, recordHash: sha256(snapshot) };
}

function buildTechnicals(chart: CoingeckoMarketChart): TechnicalSnapshot {
  const prices = toArray(chart.prices)
    .map((row) => (Array.isArray(row) ? numberOrNull(row[1]) : null))
    .filter((value): value is number => value !== null);
  const volumes = toArray(chart.total_volumes)
    .map((row) => (Array.isArray(row) ? numberOrNull(row[1]) : null))
    .filter((value): value is number => value !== null);
  const firstPrice = prices[0] ?? null;
  const latestPrice = prices.at(-1) ?? null;
  const periodHigh = prices.length ? Math.max(...prices) : null;
  const ma30 = movingAverage(prices, 30);
  const ma90 = movingAverage(prices, 90);
  const ma200 = movingAverage(prices, 200);
  const latestVolume = volumes.at(-1) ?? null;
  const avgVol30 = movingAverage(volumes, 30);
  return {
    firstPriceUsd: firstPrice,
    latestPriceUsd: latestPrice,
    periodReturnPct: pctChange(firstPrice, latestPrice),
    drawdownFromPeriodHighPct: pctChange(periodHigh, latestPrice),
    movingAveragesUsd: { ma30, ma90, ma200 },
    latestVsMovingAveragesPct: {
      ma30: pctChange(ma30, latestPrice),
      ma90: pctChange(ma90, latestPrice),
      ma200: pctChange(ma200, latestPrice),
    },
    rsi14: rsi(prices, 14),
    latestVolumeUsd: latestVolume,
    averageVolume30dUsd: avgVol30,
    latestVolumeVs30dAvgPct: pctChange(avgVol30, latestVolume),
    sampleDays: prices.length,
  };
}

function buildEvidenceMatrix(args: {
  current: Record<string, unknown>;
  technicals: TechnicalSnapshot;
  protocol: ProtocolSnapshot | null;
  fees: FeesSnapshot | null;
  landscape: LandscapeSnapshot | null;
  bankless: BanklessPodcastDigest;
  assetSymbol: string;
}): EvidenceCard[] {
  const priceChange30d = numberOrNull(args.current.price_change_percentage_30d_in_currency);
  const marketCap = numberOrNull(args.current.market_cap);
  const volume = numberOrNull(args.current.total_volume);
  return [
    {
      lens: "macro_liquidity_cycle",
      signal: args.landscape ? "mixed" : "missing",
      finding: args.landscape
        ? "Landscape context is available for stablecoin supply and DEX activity, giving the thesis a cycle backdrop."
        : "Landscape context was not requested or could not be fetched.",
      metrics: {
        stablecoinSupplyUsd: args.landscape?.stablecoinSupplyUsd ?? null,
        dexVolume30dUsd: args.landscape?.dexVolume30dUsd ?? null,
      },
      sourceIds: ["defillama"],
      nextQuestion: "Are stablecoin supply and DEX volumes expanding alongside the asset narrative?",
    },
    {
      lens: "market_structure_technicals",
      signal: technicalSignal(args.technicals),
      finding: "Technical context compares current price with moving averages, RSI, drawdown, and volume trend.",
      metrics: {
        latestPriceUsd: args.technicals.latestPriceUsd,
        periodReturnPct: args.technicals.periodReturnPct,
        drawdownFromPeriodHighPct: args.technicals.drawdownFromPeriodHighPct,
        rsi14: args.technicals.rsi14,
        latestVsMa90Pct: args.technicals.latestVsMovingAveragesPct.ma90,
      },
      sourceIds: ["coingecko"],
      nextQuestion: "Is price strength broad and persistent, or mostly a short squeeze/liquidity event?",
    },
    {
      lens: "onchain_fundamentals",
      signal: args.protocol || args.fees ? "supportive" : "missing",
      finding: args.protocol || args.fees ? "Protocol TVL and fee data are available for a fundamentals check." : "No DeFiLlama protocol slug was supplied.",
      metrics: {
        latestTvlUsd: args.protocol?.latestTvlUsd ?? null,
        tvlChange30dPct: args.protocol?.tvlChange30dPct ?? null,
        fees30dUsd: args.fees?.total30dUsd ?? null,
        annualizedFeesRunRateUsd: args.fees?.annualizedFeesRunRateUsd ?? null,
      },
      sourceIds: ["defillama"],
      nextQuestion: "Do fees, TVL, and usage grow together, or is one metric doing all the work?",
    },
    {
      lens: "business_model_value_accrual",
      signal: marketCap || volume || priceChange30d ? "mixed" : "missing",
      finding: "Market value and liquidity are present, but value accrual needs independent token/equity mechanics review.",
      metrics: {
        marketCapUsd: marketCap,
        volume24hUsd: volume,
        priceChange30dPct: priceChange30d,
      },
      sourceIds: ["coingecko", "the_defi_report_public_metadata"],
      nextQuestion: `For ${args.assetSymbol}, which stakeholders actually capture fees, liquidity growth, or balance-sheet value?`,
    },
    {
      lens: "narrative_and_research_flow",
      signal: args.bankless.episodes.length > 0 ? "supportive" : "weak",
      finding: args.bankless.episodes.length
        ? "Bankless RSS has relevant public episode metadata to seed narrative monitoring."
        : "No Bankless episode metadata matched the query.",
      metrics: {
        matchingBanklessEpisodes: args.bankless.episodes.length,
      },
      sourceIds: ["bankless_podcast_rss", "bankless_onchain_mcp"],
      nextQuestion: "Which narrative claims are repeated by trusted sources, and which are unsupported by data?",
    },
    {
      lens: "risk_and_portfolio_construction",
      signal: "mixed",
      finding: "The output keeps risk as an explicit research section and avoids portfolio-personalized advice.",
      metrics: {
        sampleDays: args.technicals.sampleDays,
      },
      sourceIds: ["coingecko", "defillama", "bankless_podcast_rss"],
      nextQuestion: "What evidence would falsify the thesis over the next 30, 90, and 180 days?",
    },
  ];
}

function scoreEvidence(args: {
  technicals: TechnicalSnapshot;
  protocol: ProtocolSnapshot | null;
  fees: FeesSnapshot | null;
  bankless: BanklessPodcastDigest;
  evidenceMatrix: EvidenceCard[];
}) {
  const technicalComponents = [
    args.technicals.latestVsMovingAveragesPct.ma30,
    args.technicals.latestVsMovingAveragesPct.ma90,
    args.technicals.periodReturnPct,
  ].filter((value): value is number => value !== null);
  const technicalScore = technicalComponents.length
    ? clampInt(Math.round(50 + average(technicalComponents.map((value) => Math.max(-50, Math.min(50, value))))), 0, 100)
    : null;
  const fundamentalsScore =
    args.protocol || args.fees
      ? clampInt(
          Math.round(
            40 +
              (args.protocol?.tvlChange30dPct ? Math.max(-20, Math.min(25, args.protocol.tvlChange30dPct)) : 0) +
              (args.fees?.total30dUsd ? 20 : 0) +
              (args.fees?.change1dPct ? Math.max(-10, Math.min(10, args.fees.change1dPct)) : 0),
          ),
          0,
          100,
        )
      : null;
  const availableSignals = args.evidenceMatrix.filter((card) => card.signal !== "missing").length;
  return {
    fundamentalsScore,
    technicalScore,
    narrativeScore: clampInt(args.bankless.episodes.length * 15, 0, 100),
    evidenceCompleteness: Math.round((availableSignals / args.evidenceMatrix.length) * 100),
    notes: [
      "Scores are heuristic evidence-readiness scores, not recommendations.",
      "Fundamentals score requires a DeFiLlama protocol slug; otherwise it remains null.",
      "Technical score is based on public CoinGecko price/volume history only.",
    ],
  };
}

function buildResearchQuestions(assetSymbol: string, protocol: ProtocolSnapshot | null, fees: FeesSnapshot | null, technicals: TechnicalSnapshot): string[] {
  return [
    `What is the cleanest value-accrual path for ${assetSymbol}: fees, monetary premium, collateral demand, governance control, or equity-like cash flow?`,
    protocol ? `Why did ${protocol.name ?? protocol.slug} TVL change ${formatPct(protocol.tvlChange30dPct)} over the last 30 days?` : "Which DeFiLlama protocol slug, if any, maps cleanly to this asset?",
    fees ? `Are 30-day fees of ${formatUsd(fees.total30dUsd)} durable, seasonal, or event-driven?` : "Is there fee or revenue data, and who captures it?",
    `Does the latest price sit above or below the 90-day moving average (${formatPct(technicals.latestVsMovingAveragesPct.ma90)}) for thesis confirmation?`,
    "What public evidence would make this a no-go despite strong narrative momentum?",
  ];
}

function normalizeBanklessEpisode(item: RssItem): BanklessEpisode {
  const summary = cleanText(valueText(item["itunes:summary"] ?? item.description ?? item["content:encoded"] ?? ""));
  const title = cleanText(valueText(item["itunes:title"] ?? item.title ?? "Untitled episode"));
  const link = cleanText(valueText(item.link ?? "")) || null;
  const publishedAt = parseDate(valueText(item.pubDate ?? ""));
  const durationSeconds = parseDuration(valueText(item["itunes:duration"] ?? ""));
  const topicTags = inferTopicTags(`${title} ${summary}`);
  const episode = {
    title,
    publishedAt,
    durationSeconds,
    link,
    summary: truncate(summary, 560),
    topicTags,
    sourceUrl: BANKLESS_RSS_URL,
  };
  return { ...episode, recordHash: sha256(episode) };
}

function valueText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const maybe = value as { __cdata?: string; "#text"?: string };
    return maybe.__cdata ?? maybe["#text"] ?? "";
  }
  return "";
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function inferTopicTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];
  const candidates: Array<[string, RegExp]> = [
    ["ethereum", /\beth\b|ethereum/],
    ["bitcoin", /\bbtc\b|bitcoin/],
    ["defi", /\bdefi\b|dex|lending|yield|stablecoin/],
    ["macro", /macro|inflation|rates|fed|liquidity|bond|tariff/],
    ["investing", /invest|portfolio|market|valuation|cycle|risk/],
    ["technology", /ai|rollup|layer 2|l2|evm|zk|privacy|quantum/],
    ["regulation", /sec|regulation|law|policy|court/],
  ];
  for (const [tag, pattern] of candidates) {
    if (pattern.test(lower)) tags.push(tag);
  }
  return tags;
}

function parseDate(value: string): string | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function parseDuration(value: string): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10);
  const parts = value.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => !Number.isFinite(part))) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

function movingAverage(values: number[], window: number): number | null {
  if (values.length < window) return null;
  return round(average(values.slice(-window)));
}

function rsi(values: number[], window: number): number | null {
  if (values.length <= window) return null;
  const recent = values.slice(-(window + 1));
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < recent.length; i += 1) {
    const diff = recent[i] - recent[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const relativeStrength = gains / window / (losses / window);
  return round(100 - 100 / (1 + relativeStrength));
}

function technicalSignal(technicals: TechnicalSnapshot): EvidenceCard["signal"] {
  const ma90 = technicals.latestVsMovingAveragesPct.ma90;
  const drawdown = technicals.drawdownFromPeriodHighPct;
  if (ma90 === null && drawdown === null) return "missing";
  if ((ma90 ?? 0) > 5 && (drawdown ?? -100) > -25) return "supportive";
  if ((ma90 ?? 0) < -10 || (drawdown ?? 0) < -45) return "weak";
  return "mixed";
}

function pctChange(from: number | null | undefined, to: number | null | undefined): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return round(((to! - from!) / Math.abs(from!)) * 100);
}

function latestNumber(values: Array<number | null | undefined>): number | null {
  for (const value of [...values].reverse()) {
    const normalized = numberOrNull(value);
    if (normalized !== null) return normalized;
  }
  return null;
}

function numberOrNull(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(number) ? number : null;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function normalizeTimeoutMs(value: number | undefined): number {
  if (!Number.isFinite(value)) return 8_000;
  return Math.max(250, Math.min(value!, 30_000));
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trim()}...` : value;
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function sourceLabel(url: string): string {
  if (url.includes("coingecko")) return "CoinGecko";
  if (url.includes("llama.fi")) return "DeFiLlama";
  if (url.includes("redcircle")) return "Bankless RSS";
  return "Upstream";
}

function formatPct(value: number | null): string {
  return value === null ? "missing" : `${round(value)}%`;
}

function formatUsd(value: number | null): string {
  if (value === null) return "missing";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

const DEFI_REPORT_PUBLIC_INVENTORY = [
  {
    title: "The Watch List: Zcash (ZEC)",
    url: "https://thedefireport.io/research/the-watch-list-zcash-zec",
    publishedAt: null,
    author: "Michael Nadeau",
    publicSignal: "Open Brave tab detected in Ari workspace",
    topics: ["watch list", "Zcash", "fair value", "privacy asset"],
    methodTags: ["watch_list", "valuation", "risk", "token_thesis"],
  },
  {
    title: "Crypto Landscape Health Check",
    url: "https://thedefireport.io/research/crypto-landscape-health-check",
    publishedAt: "2026-04-03",
    author: "Michael Nadeau",
    publicSignal: "Search-index metadata",
    topics: ["total crypto market cap", "spot markets", "perpetual futures markets", "stablecoins", "new trading tokens", "L1 base fees vs Pump Fun"],
    methodTags: ["market_structure", "stablecoins", "perps", "fees", "cycle"],
  },
  {
    title: "The Watch List: COIN",
    url: "https://thedefireport.io/research/the-watch-list-coin",
    publishedAt: "2026-02-20",
    author: "Michael Nadeau",
    publicSignal: "Search-index metadata",
    topics: ["2021-2025 revenues", "operating expenses", "balance sheet", "competition", "valuation comp to HOOD", "risks"],
    methodTags: ["watch_list", "financials", "equity_comp", "valuation", "risk"],
  },
  {
    title: "Macro Update: February 2026",
    url: "https://thedefireport.io/research/macro-update-february-2026",
    publishedAt: "2026-02-18",
    author: "Michael Nadeau",
    publicSignal: "Search-index metadata",
    topics: ["current setup", "bull case", "portfolio management"],
    methodTags: ["macro", "cycle", "portfolio_management"],
  },
  {
    title: "The Watch List: Kamino Finance",
    url: "https://thedefireport.io/research/the-watch-list-kamino-finance",
    publishedAt: "2026-02-07",
    author: "Michael Nadeau",
    publicSignal: "Search-index metadata",
    topics: ["team", "capital raised", "investors", "product", "addressable market", "financials", "fundamentals", "token economics", "competition", "valuation"],
    methodTags: ["watch_list", "team", "product", "tam", "financials", "fundamentals", "tokenomics", "competition", "valuation"],
  },
  {
    title: "The Watch List: SUI",
    url: "https://thedefireport.io/research/the-watch-list-sui",
    publishedAt: "2026-01-30",
    author: "Michael Nadeau",
    publicSignal: "Search-index metadata",
    topics: ["team", "capital raised", "investors", "product", "addressable market", "financials", "fundamentals", "token economics", "competition", "valuation"],
    methodTags: ["watch_list", "team", "product", "tam", "financials", "fundamentals", "tokenomics", "competition", "valuation"],
  },
  {
    title: "The Watch List: Hyperliquid",
    url: "https://thedefireport.io/research/the-watch-list-hyperliquid",
    publishedAt: "2026-01-23",
    author: "Michael Nadeau",
    publicSignal: "Search-index metadata",
    topics: ["perps DEX financials", "perps DEX fundamentals", "HyperEVM fundamentals", "token economics", "valuation", "relative performance"],
    methodTags: ["watch_list", "perps", "financials", "fundamentals", "tokenomics", "valuation", "relative_performance"],
  },
  {
    title: "Our Outlook for 2026",
    url: "https://thedefireport.io/research/our-outlook-for-2026",
    publishedAt: "2026-01-07",
    author: "Michael Nadeau",
    publicSignal: "Search-index metadata",
    topics: ["strategy", "liquidity conditions", "liquidity cycle", "crypto cycle", "portfolio management"],
    methodTags: ["macro", "liquidity", "cycle", "portfolio_management"],
  },
  {
    title: "The Watch List: Robinhood",
    url: "https://thedefireport.io/research/the-watch-list-robinhood",
    publishedAt: "2025-12-12",
    author: "Michael Nadeau",
    publicSignal: "Search-index metadata",
    topics: ["revenues", "revenue growth", "fundamentals", "valuation comps", "crypto product roadmap", "risks"],
    methodTags: ["watch_list", "financials", "fundamentals", "equity_comp", "roadmap", "risk"],
  },
  {
    title: "Hyperliquid Memo",
    url: "https://thedefireport.io/research/hyperliquid-memo",
    publishedAt: "2025-08-29",
    author: "Michael Nadeau",
    publicSignal: "Search-index metadata",
    topics: ["no VC launch", "airdrop", "product", "EVM", "addressable market", "fundamentals", "token economics", "competition", "valuation", "risks"],
    methodTags: ["memo", "launch_structure", "product", "tam", "fundamentals", "tokenomics", "competition", "valuation", "risk"],
  },
  {
    title: "Are we mid-cycle or late-cycle?",
    url: "https://thedefireport.io/research/are-we-mid-cycle-or-late-cycle",
    publishedAt: "2025-08-27",
    author: "Michael Nadeau",
    publicSignal: "Search-index metadata",
    topics: ["business cycle data", "onchain data", "portfolio management"],
    methodTags: ["macro", "cycle", "onchain", "portfolio_management"],
  },
  {
    title: "Fiscal Dominance & MMT",
    url: "https://thedefireport.io/research/fiscal-dominance-mmt",
    publishedAt: "2025-06-13",
    author: "Michael Nadeau",
    publicSignal: "Search-index metadata",
    topics: ["macro", "crypto data", "sentiment", "risks"],
    methodTags: ["macro", "sentiment", "risk", "cycle"],
  },
  {
    title: "Bankless <> The DeFi Report",
    url: "https://thedefireport.io/research/we-partnered-with-bankless",
    publishedAt: "2025-05-27",
    author: "Michael Nadeau",
    publicSignal: "Public page metadata",
    topics: ["why Bankless", "what is next", "planting a flag"],
    methodTags: ["distribution", "bankless", "research_partnership"],
  },
  {
    title: "Analyzing Flows Between Blockchains",
    url: "https://thedefireport.io/research/analyzing-flows-between-blockchains",
    publishedAt: "2024-04-10",
    author: "Michael Nadeau",
    publicSignal: "Search-index metadata",
    topics: ["net flows", "source chains", "projects gaining flows", "chains losing flows", "key takeaways"],
    methodTags: ["flows", "onchain", "network_rotation", "cycle"],
  },
  {
    title: "A New Open Standard",
    url: "https://thedefireport.io/research/a-new-open-standard",
    publishedAt: "2022-11-21",
    author: "Michael Nadeau",
    publicSignal: "Public page metadata",
    topics: ["thesis", "opportunity", "web3 tech stack", "value accrual", "mission"],
    methodTags: ["first_principles", "tech_stack", "value_accrual", "mission"],
  },
  {
    title: "A Mental Model to Evaluate Blockchain Technology",
    url: "https://thedefireport.io/research/a-mental-model-to-evaluate-blockchain",
    publishedAt: "2021-09-13",
    author: "Michael Nadeau",
    publicSignal: "Search-index metadata",
    topics: ["high-level tech trends", "current internet", "why blockchains can change the internet", "web3 tech stack", "value accrual"],
    methodTags: ["first_principles", "technology", "tech_stack", "value_accrual"],
  },
] as const;

interface RssDocument {
  rss?: {
    channel?: {
      item?: RssItem | RssItem[];
    };
  };
}

interface RssItem {
  title?: unknown;
  "itunes:title"?: unknown;
  "itunes:summary"?: unknown;
  "itunes:duration"?: unknown;
  description?: unknown;
  "content:encoded"?: unknown;
  link?: unknown;
  pubDate?: unknown;
}

interface CoingeckoMarketRow {
  [key: string]: unknown;
}

interface CoingeckoMarketChart {
  prices?: unknown[];
  total_volumes?: unknown[];
}

interface DefiLlamaProtocol {
  name?: string;
  category?: string;
  chain?: string;
  chains?: unknown[];
  tvl?: Array<{ date?: number; totalLiquidityUSD?: number }>;
}

interface DefiLlamaFees {
  name?: string;
  total24h?: number;
  total7d?: number;
  total30d?: number;
  totalAllTime?: number;
  change_1d?: number;
}

interface DefiLlamaOverview {
  total24h?: number;
  total7d?: number;
  total30d?: number;
}

interface StablecoinOverview {
  peggedAssets?: Array<{
    circulating?: {
      peggedUSD?: number;
    };
  }>;
}
