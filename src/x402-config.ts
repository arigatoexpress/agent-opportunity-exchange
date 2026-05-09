const BASE_SEPOLIA_NETWORK = "eip155:84532";
const DEFAULT_TESTNET_FACILITATOR_URL = "https://x402.org/facilitator";
const DEFAULT_SIMULATED_PAY_TO = "0x000000000000000000000000000000000000dEaD";
const MAINNET_NETWORKS = new Set(["eip155:8453", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", "stellar:pubnet"]);

export type PaymentMode = "simulated" | "x402_testnet";

export interface X402PaymentStatus {
  protocol: "x402";
  mode: PaymentMode;
  activeRail: "simulated_header" | "official_x402_testnet" | "x402_testnet_config_required";
  ready: boolean;
  liveSettlementAllowed: false;
  serverPrivateKeyRequired: false;
  network: {
    id: string;
    label: "Base Sepolia";
    testnet: true;
    mainnet: false;
  };
  facilitator: {
    url: string;
    defaultTestnet: boolean;
  };
  payTo: {
    configured: boolean;
    address?: string;
    redacted?: string;
  };
  acceptedAsset: "USDC";
  errors: string[];
  warnings: string[];
}

export interface ReadyX402TestnetConfig {
  mode: "x402_testnet";
  network: typeof BASE_SEPOLIA_NETWORK;
  facilitatorUrl: string;
  payTo: string;
}

export function getX402PaymentStatus(env: NodeJS.ProcessEnv = process.env): X402PaymentStatus {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mode = normalizePaymentMode(env.AOE_PAYMENT_MODE, errors);
  const network = (env.AOE_X402_NETWORK ?? env.AOE_TESTNET_NETWORK ?? BASE_SEPOLIA_NETWORK).trim();
  const facilitatorUrl = normalizeUrl(env.AOE_X402_FACILITATOR_URL ?? env.X402_FACILITATOR_URL ?? DEFAULT_TESTNET_FACILITATOR_URL);
  const payTo = (env.AOE_X402_PAY_TO ?? env.EVM_PAY_TO ?? "").trim();

  if (network !== BASE_SEPOLIA_NETWORK) {
    errors.push(`unsupported_network:${network || "empty"}`);
  }
  if (MAINNET_NETWORKS.has(network)) {
    errors.push(`mainnet_network_blocked:${network}`);
  }
  if (!facilitatorUrl.startsWith("https://")) {
    errors.push("facilitator_url_must_be_https");
  }
  if (mode === "x402_testnet" && !payTo) {
    errors.push("missing_AOE_X402_PAY_TO");
  }
  if (payTo && !/^0x[a-fA-F0-9]{40}$/.test(payTo)) {
    errors.push("invalid_AOE_X402_PAY_TO");
  }
  if (mode === "simulated" && payTo) {
    warnings.push("AOE_X402_PAY_TO is configured but ignored while AOE_PAYMENT_MODE=simulated");
  }
  if (facilitatorUrl !== DEFAULT_TESTNET_FACILITATOR_URL) {
    warnings.push("non_default_facilitator_url_configured_verify_it_is_testnet_only");
  }

  const ready = mode === "x402_testnet" && errors.length === 0;
  return {
    protocol: "x402",
    mode,
    activeRail: mode === "simulated" ? "simulated_header" : ready ? "official_x402_testnet" : "x402_testnet_config_required",
    ready,
    liveSettlementAllowed: false,
    serverPrivateKeyRequired: false,
    network: {
      id: BASE_SEPOLIA_NETWORK,
      label: "Base Sepolia",
      testnet: true,
      mainnet: false,
    },
    facilitator: {
      url: facilitatorUrl,
      defaultTestnet: facilitatorUrl === DEFAULT_TESTNET_FACILITATOR_URL,
    },
    payTo: {
      configured: Boolean(payTo),
      ...(payTo ? { address: payTo, redacted: redactAddress(payTo) } : {}),
    },
    acceptedAsset: "USDC",
    errors,
    warnings,
  };
}

export function getReadyX402TestnetConfig(env: NodeJS.ProcessEnv = process.env): ReadyX402TestnetConfig | null {
  const status = getX402PaymentStatus(env);
  if (!status.ready || !status.payTo.address) return null;
  return {
    mode: "x402_testnet",
    network: BASE_SEPOLIA_NETWORK,
    facilitatorUrl: status.facilitator.url,
    payTo: status.payTo.address,
  };
}

export function simulatedPayTo(env: NodeJS.ProcessEnv = process.env): string {
  return (env.AOE_SIMULATED_PAY_TO ?? DEFAULT_SIMULATED_PAY_TO).trim() || DEFAULT_SIMULATED_PAY_TO;
}

function normalizePaymentMode(value: string | undefined, errors: string[]): PaymentMode {
  const normalized = (value ?? "simulated").trim().toLowerCase();
  if (!normalized || normalized === "simulated") return "simulated";
  if (normalized === "x402_testnet" || normalized === "testnet") return "x402_testnet";
  errors.push(`unsupported_payment_mode:${normalized}`);
  return "simulated";
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function redactAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
