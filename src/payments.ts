import { shortHash, sha256 } from "./hash.js";
import type { Artifact, Quote, Receipt } from "./types.js";
import { getProduct } from "./catalog.js";

const DEFAULT_NETWORK = process.env.AOE_TESTNET_NETWORK ?? "eip155:84532";
const DEFAULT_PAY_TO = process.env.AOE_SIMULATED_PAY_TO ?? "0x000000000000000000000000000000000000dEaD";

export function buildQuote(artifact: Artifact, now = new Date()): Quote {
  const product = getProduct(artifact.productId);
  if (!product) {
    throw new Error(`Product not found for artifact ${artifact.artifactId}`);
  }

  const quoteDate = now.toISOString().slice(0, 10);
  const quoteSeed = {
    artifactId: artifact.artifactId,
    productId: product.productId,
    priceUsd: product.priceUsd,
    quoteDate,
    mode: product.settlementMode,
  };
  const quoteId = `quote_${shortHash(quoteSeed, 18)}`;
  const workOrderId = `wo_${shortHash({ quoteId, artifactHash: sha256(artifact.content) }, 18)}`;
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

  return {
    quoteId,
    workOrderId,
    artifactId: artifact.artifactId,
    productId: product.productId,
    priceUsd: product.priceUsd,
    currency: "USDC",
    paymentProtocol: "x402",
    settlementMode: product.settlementMode,
    liveSettlementAllowed: false,
    expiresAt,
    accepted: [
      {
        scheme: "exact",
        network: DEFAULT_NETWORK,
        asset: "USDC",
        amountUsd: product.priceUsd,
        payTo: DEFAULT_PAY_TO,
      },
    ],
    rights: artifact.rights,
    sourceIds: artifact.sourceIds,
  };
}

export function expectedSimulatedPayment(workOrderId: string): string {
  return `simulated:${workOrderId}`;
}

export function hasValidSimulatedPayment(headers: Headers, quote: Quote): boolean {
  const payment = headers.get("x-aoe-payment") ?? headers.get("payment-signature") ?? "";
  return payment.trim() === expectedSimulatedPayment(quote.workOrderId);
}

export function paymentRequiredPayload(quote: Quote): Record<string, unknown> {
  return {
    error: "payment_required",
    protocol: "x402",
    mode: "simulated_or_testnet",
    liveSettlementAllowed: false,
    workOrderId: quote.workOrderId,
    quote,
    instructions: [
      "Local demo only: do not send funds to the simulated payTo address.",
      `Retry with header X-AOE-Payment: ${expectedSimulatedPayment(quote.workOrderId)}`,
      "Replace this shim with @x402 middleware only after compliance, refunds, KYT/sanctions, source-rights, and tax handling are ready.",
    ],
  };
}

export function paymentRequiredHeader(quote: Quote): string {
  return Buffer.from(JSON.stringify(paymentRequiredPayload(quote))).toString("base64url");
}

export function buildReceipt(artifact: Artifact, quote: Quote, now = new Date()): Receipt {
  return {
    receiptId: `rcpt_${shortHash({ quoteId: quote.quoteId, paidAt: now.toISOString() }, 18)}`,
    quoteId: quote.quoteId,
    workOrderId: quote.workOrderId,
    artifactId: artifact.artifactId,
    productId: artifact.productId,
    settlementMode: "simulated_or_testnet",
    liveSettlementAllowed: false,
    paidAt: now.toISOString(),
    artifactHash: sha256(artifact.content),
    sourceIds: artifact.sourceIds,
    rights: artifact.rights,
  };
}
