import { getX402PaymentStatus } from "./x402-config.js";

export type PaymentRailReadiness =
  | "active_local_simulation"
  | "active_testnet"
  | "testnet_configurable"
  | "config_required"
  | "planned_sandbox_adapter"
  | "blocked_until_compliance_review";

export interface PaymentRailCapability {
  railId: string;
  providerId: "aoe_local" | "x402_foundation" | "pay_sh";
  label: string;
  protocols: Array<"simulated_x402" | "x402" | "mpp">;
  network: {
    family: "local" | "evm" | "solana";
    id: string;
    label: string;
    caip2?: string;
    testnet: boolean;
    mainnet: boolean;
  };
  asset: {
    symbol: "USDC";
    standard: "demo" | "ERC-20" | "SPL-or-Token-2022";
  };
  readiness: PaymentRailReadiness;
  activeInRuntime: boolean;
  sourceIds: string[];
  sourceUrls: string[];
  liveSettlementAllowed: false;
  externalSideEffectsAllowed: false;
  spendAuthorizationRequired: boolean;
  openSourceBuildingBlocks: string[];
  agentDataEngineeringUseCases: string[];
  integrationGates: string[];
  safetyNotes: string[];
}

export interface PaymentRailRoadmap {
  schemaId: "aoe.payment_rails.v1";
  generatedAt: string;
  liveSettlementAllowed: false;
  externalSideEffectsAllowed: false;
  activeRuntimeRail: string;
  railPosture: "simulation_first_testnet_only";
  counts: Record<PaymentRailReadiness, number> & {
    total: number;
    liveEnabled: 0;
  };
  rails: PaymentRailCapability[];
  nextMilestones: string[];
}

const X402_NETWORKS_URL = "https://docs.x402.org/core-concepts/network-and-token-support";
const X402_FAQ_URL = "https://docs.x402.org/faq";
const PAY_SH_DOCS_URL = "https://pay.sh/docs";
const PAY_SH_SERVER_URL = "https://pay.sh/docs/get-started/server-quickstart";
const SOLANA_PAY_SH_URL = "https://solana.com/uk/news/solana-foundation-launches-pay-sh-in-collaboration-with-google-cloud";
const SOLANA_PAY_GITHUB_URL = "https://github.com/solana-foundation/pay";

export function buildPaymentRailRoadmap(now = new Date()): PaymentRailRoadmap {
  const x402Status = getX402PaymentStatus();
  const baseReadiness =
    x402Status.activeRail === "official_x402_testnet"
      ? "active_testnet"
      : x402Status.mode === "x402_testnet"
        ? "config_required"
        : "testnet_configurable";

  const rails: PaymentRailCapability[] = [
    {
      railId: "aoe_simulated_header",
      providerId: "aoe_local",
      label: "AOE simulated x402-compatible header",
      protocols: ["simulated_x402"],
      network: {
        family: "local",
        id: "local:simulated",
        label: "Local simulation",
        testnet: true,
        mainnet: false,
      },
      asset: {
        symbol: "USDC",
        standard: "demo",
      },
      readiness: "active_local_simulation",
      activeInRuntime: x402Status.activeRail === "simulated_header",
      sourceIds: ["x402_docs_faq"],
      sourceUrls: [X402_FAQ_URL],
      liveSettlementAllowed: false,
      externalSideEffectsAllowed: false,
      spendAuthorizationRequired: false,
      openSourceBuildingBlocks: ["Hono route contracts", "AOE receipt ledger", "Payment-Required header payload"],
      agentDataEngineeringUseCases: [
        "Local agent purchase rehearsals",
        "Quote and receipt contract tests",
        "Buyer preflight UX without wallet setup",
      ],
      integrationGates: ["Keep demo payTo addresses clearly labeled.", "Never treat the simulated header as proof of funds."],
      safetyNotes: ["No blockchain transaction is created.", "No private key or wallet material is handled by the server."],
    },
    {
      railId: "x402_base_sepolia_testnet",
      providerId: "x402_foundation",
      label: "Official x402 middleware on Base Sepolia",
      protocols: ["x402"],
      network: {
        family: "evm",
        id: "base-sepolia",
        label: "Base Sepolia",
        caip2: "eip155:84532",
        testnet: true,
        mainnet: false,
      },
      asset: {
        symbol: "USDC",
        standard: "ERC-20",
      },
      readiness: baseReadiness,
      activeInRuntime: x402Status.activeRail === "official_x402_testnet",
      sourceIds: ["x402_docs_networks", "x402_docs_faq"],
      sourceUrls: [X402_NETWORKS_URL, X402_FAQ_URL],
      liveSettlementAllowed: false,
      externalSideEffectsAllowed: false,
      spendAuthorizationRequired: true,
      openSourceBuildingBlocks: ["@x402/hono", "@x402/core", "@x402/evm", "@x402/fetch"],
      agentDataEngineeringUseCases: [
        "Paid artifact content on a testnet rail",
        "Receipt and payment-response hash capture",
        "Agent preflight checks against price and source allow-lists",
      ],
      integrationGates: [
        "Require AOE_PAYMENT_MODE=x402_testnet and AOE_X402_PAY_TO.",
        "Reject mainnet CAIP-2 identifiers in the runtime config.",
        "Keep buyer keys outside the seller service.",
      ],
      safetyNotes: ["Base mainnet remains blocked.", "The service stores non-secret receipt metadata only."],
    },
    {
      railId: "pay_sh_solana_sandbox",
      providerId: "pay_sh",
      label: "Pay.sh Solana sandbox adapter",
      protocols: ["x402", "mpp"],
      network: {
        family: "solana",
        id: "solana-sandbox",
        label: "Solana sandbox / devnet-compatible",
        caip2: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
        testnet: true,
        mainnet: false,
      },
      asset: {
        symbol: "USDC",
        standard: "SPL-or-Token-2022",
      },
      readiness: "planned_sandbox_adapter",
      activeInRuntime: false,
      sourceIds: ["pay_sh_docs", "solana_pay_sh_launch", "solana_foundation_pay_github", "x402_docs_networks"],
      sourceUrls: [PAY_SH_DOCS_URL, PAY_SH_SERVER_URL, SOLANA_PAY_SH_URL, SOLANA_PAY_GITHUB_URL, X402_NETWORKS_URL],
      liveSettlementAllowed: false,
      externalSideEffectsAllowed: false,
      spendAuthorizationRequired: true,
      openSourceBuildingBlocks: [
        "solana-foundation/pay CLI",
        "pay server sandbox gateway",
        "pay-skills catalog metadata",
        "AOE rail registry contract",
      ],
      agentDataEngineeringUseCases: [
        "Make AOE artifacts discoverable as explicit priced endpoints.",
        "Expose BigQuery or Cloud Run backed data products through a sandbox gateway after source-rights review.",
        "Build provider specs that agents can compare before spending.",
      ],
      integrationGates: [
        "Prototype with pay --sandbox only.",
        "Publish gateway URLs, not upstream provider URLs.",
        "Require explicit local wallet authorization before any real payment.",
        "Complete KYT/sanctions, refunds, tax/accounting, buyer terms, and source-license review before mainnet.",
      ],
      safetyNotes: [
        "This is a roadmap rail, not the active AOE content gate.",
        "Google Cloud and community API access must be treated as provider-mediated external content.",
      ],
    },
    {
      railId: "pay_sh_solana_mainnet",
      providerId: "pay_sh",
      label: "Pay.sh Solana mainnet settlement",
      protocols: ["x402", "mpp"],
      network: {
        family: "solana",
        id: "solana-mainnet",
        label: "Solana mainnet",
        caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        testnet: false,
        mainnet: true,
      },
      asset: {
        symbol: "USDC",
        standard: "SPL-or-Token-2022",
      },
      readiness: "blocked_until_compliance_review",
      activeInRuntime: false,
      sourceIds: ["pay_sh_docs", "solana_pay_sh_launch", "solana_foundation_pay_github", "x402_docs_faq"],
      sourceUrls: [PAY_SH_DOCS_URL, SOLANA_PAY_SH_URL, SOLANA_PAY_GITHUB_URL, X402_FAQ_URL],
      liveSettlementAllowed: false,
      externalSideEffectsAllowed: false,
      spendAuthorizationRequired: true,
      openSourceBuildingBlocks: ["solana-foundation/pay", "AOE receipt ledger", "future accounting export"],
      agentDataEngineeringUseCases: [
        "Production pay-per-call data APIs after compliance review.",
        "Provider reconciliation across receipts, source freshness, and delivery hashes.",
      ],
      integrationGates: [
        "Human approval for mainnet mode.",
        "Refund and dispute workflow.",
        "Provider terms and customer billing review.",
        "Secret-management and deployment review.",
      ],
      safetyNotes: ["Not runnable in this repo today.", "No mainnet funds should be sent to AOE demo endpoints."],
    },
  ];

  const counts = rails.reduce(
    (acc, rail) => {
      acc[rail.readiness] += 1;
      acc.total += 1;
      return acc;
    },
    {
      active_local_simulation: 0,
      active_testnet: 0,
      testnet_configurable: 0,
      config_required: 0,
      planned_sandbox_adapter: 0,
      blocked_until_compliance_review: 0,
      total: 0,
      liveEnabled: 0,
    } satisfies PaymentRailRoadmap["counts"],
  );

  return {
    schemaId: "aoe.payment_rails.v1",
    generatedAt: now.toISOString(),
    liveSettlementAllowed: false,
    externalSideEffectsAllowed: false,
    activeRuntimeRail: x402Status.activeRail,
    railPosture: "simulation_first_testnet_only",
    counts,
    rails,
    nextMilestones: [
      "Keep Base Sepolia as the only official middleware gate until receipts and refunds are boring.",
      "Build a Pay.sh sandbox provider spec for one AOE preview endpoint before any paid content path.",
      "Add MCP tool descriptors for quote, preflight, rail discovery, and receipt lookup.",
      "Only consider Solana mainnet after compliance, accounting, buyer terms, and source-rights review.",
    ],
  };
}
