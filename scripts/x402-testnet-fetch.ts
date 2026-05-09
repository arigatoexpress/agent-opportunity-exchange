import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const privateKey = process.env.AOE_BUYER_EVM_PRIVATE_KEY ?? process.env.EVM_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("Missing AOE_BUYER_EVM_PRIVATE_KEY or EVM_PRIVATE_KEY. Generate one with npm run x402:burner -- --write-env.");
}
if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
  throw new Error("Buyer private key must be a 0x-prefixed 32-byte EVM private key.");
}

const baseUrl = (process.env.AOE_PUBLIC_BASE_URL ?? "http://127.0.0.1:4402").replace(/\/+$/, "");
const target = resolveTarget(process.argv[2] ?? "aoe_cyber_kev_epss_priority", baseUrl);
const maxUsd = parseUsdCap(process.env.AOE_X402_CLIENT_MAX_USD ?? "1.00");
const account = privateKeyToAccount(privateKey as `0x${string}`);

const client = new x402Client();
client
  .register("eip155:84532", new ExactEvmScheme(account))
  .registerPolicy((_version, requirements) =>
    requirements.filter((requirement) => requirement.network === "eip155:84532" && withinBaseSepoliaUsdcCap(requirement.amount, maxUsd)),
  );

const fetchWithPayment = wrapFetchWithPayment(fetch, client);
const response = await fetchWithPayment(target, {
  headers: { Accept: "application/json" },
});
const paymentResponse = response.headers.get("PAYMENT-RESPONSE");
const paymentRequired = response.headers.get("PAYMENT-REQUIRED");
const body = await response.json().catch(() => null);

console.log(
  JSON.stringify(
    {
      schemaVersion: "aoe.x402.testnet_fetch.v1",
      target,
      payer: account.address,
      network: "eip155:84532",
      maxUsd: maxUsd.toFixed(6),
      status: response.status,
      ok: response.ok,
      paymentResponseHeaderPresent: Boolean(paymentResponse),
      paymentResponseHash: paymentResponse ? await sha256Text(paymentResponse) : null,
      paymentRequired: paymentRequired ? summarizePaymentRequired(paymentRequired) : null,
      body,
    },
    null,
    2,
  ),
);

function resolveTarget(value: string, baseUrl: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only HTTP(S) targets are supported.");
    return url.toString();
  }
  return `${baseUrl}/v1/artifacts/${encodeURIComponent(value)}/content`;
}

function parseUsdCap(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("AOE_X402_CLIENT_MAX_USD must be a positive number.");
  return Math.min(parsed, 5);
}

function withinBaseSepoliaUsdcCap(amount: string, maxUsd: number): boolean {
  if (!/^\d+$/.test(amount)) return false;
  const maxMicros = BigInt(Math.floor(maxUsd * 1_000_000));
  return BigInt(amount) <= maxMicros;
}

async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function summarizePaymentRequired(header: string) {
  try {
    const decoded = decodePaymentRequiredHeader(header);
    return {
      x402Version: decoded.x402Version,
      error: decoded.error,
      accepts: decoded.accepts.map((accept) => ({
        scheme: accept.scheme,
        network: accept.network,
        amount: accept.amount,
        asset: accept.asset,
        payTo: accept.payTo,
      })),
    };
  } catch (error) {
    return { decodeError: error instanceof Error ? error.message : "unknown decode error" };
  }
}
