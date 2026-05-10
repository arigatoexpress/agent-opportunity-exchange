import { describe, expect, test } from "vitest";
import { getReadyX402TestnetConfig, getX402PaymentStatus } from "../src/x402-config.js";

describe("x402 payment configuration", () => {
  test("defaults to simulated and does not require a private key on the server", () => {
    const status = getX402PaymentStatus({});
    expect(status.mode).toBe("simulated");
    expect(status.activeRail).toBe("simulated_header");
    expect(status.ready).toBe(false);
    expect(status.liveSettlementAllowed).toBe(false);
    expect(status.serverPrivateKeyRequired).toBe(false);
    expect(status.network.id).toBe("eip155:84532");
    expect(getReadyX402TestnetConfig({})).toBeNull();
  });

  test("enables only Base Sepolia testnet when payTo is configured", () => {
    const status = getX402PaymentStatus({
      AOE_PAYMENT_MODE: "x402_testnet",
      AOE_X402_NETWORK: "eip155:84532",
      AOE_X402_PAY_TO: "0x1111111111111111111111111111111111111111",
      AOE_X402_FACILITATOR_URL: "https://x402.org/facilitator",
    });
    expect(status.ready).toBe(true);
    expect(status.activeRail).toBe("official_x402_testnet");
    expect(status.payTo.redacted).toBe("0x1111...1111");
    expect(status.errors).toEqual([]);
  });

  test("fails closed on mainnet network ids", () => {
    const status = getX402PaymentStatus({
      AOE_PAYMENT_MODE: "x402_testnet",
      AOE_X402_NETWORK: "eip155:8453",
      AOE_X402_PAY_TO: "0x1111111111111111111111111111111111111111",
    });
    expect(status.ready).toBe(false);
    expect(status.activeRail).toBe("x402_testnet_config_required");
    expect(status.errors).toContain("unsupported_network:eip155:8453");
    expect(status.errors).toContain("mainnet_network_blocked:eip155:8453");
  });

  test("fails closed on Solana mainnet ids and does not treat Pay.sh as a live mode", () => {
    const solanaMainnet = getX402PaymentStatus({
      AOE_PAYMENT_MODE: "x402_testnet",
      AOE_X402_NETWORK: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      AOE_X402_PAY_TO: "0x1111111111111111111111111111111111111111",
    });
    expect(solanaMainnet.ready).toBe(false);
    expect(solanaMainnet.activeRail).toBe("x402_testnet_config_required");
    expect(solanaMainnet.errors).toContain("unsupported_network:solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
    expect(solanaMainnet.errors).toContain("mainnet_network_blocked:solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");

    const payShMode = getX402PaymentStatus({
      AOE_PAYMENT_MODE: "pay_sh_solana_mainnet",
      AOE_X402_NETWORK: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    });
    expect(payShMode.mode).toBe("simulated");
    expect(payShMode.activeRail).toBe("simulated_header");
    expect(payShMode.ready).toBe(false);
    expect(payShMode.errors).toContain("unsupported_payment_mode:pay_sh_solana_mainnet");
    expect(payShMode.errors).toContain("unsupported_network:solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
    expect(payShMode.errors).toContain("mainnet_network_blocked:solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
  });
});
