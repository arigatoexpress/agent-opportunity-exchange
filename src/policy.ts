import { z } from "zod";
import { getArtifact, getProduct, getSource } from "./catalog.js";
import { buildQuote } from "./payments.js";
import type { Product } from "./types.js";

export const preflightSchema = z.object({
  artifactId: z.string().min(1),
  agentId: z.string().min(1).default("anonymous-agent"),
  sessionCapUsd: z.number().nonnegative().optional(),
  dailyCapUsd: z.number().nonnegative().optional(),
  maxPriceUsd: z.number().nonnegative().optional(),
  allowedSourceIds: z.array(z.string()).optional(),
  acceptedProhibitedUses: z.array(z.string()).optional(),
});

export function runPreflight(input: z.infer<typeof preflightSchema>) {
  const artifact = getArtifact(input.artifactId);
  if (!artifact) {
    return {
      allowed: false,
      reason: "artifact_not_found",
      checks: ["Artifact id is not present in the registry."],
    };
  }

  const product = getProduct(artifact.productId);
  if (!product) {
    return {
      allowed: false,
      reason: "product_not_found",
      checks: ["Artifact has no registered product."],
    };
  }

  const quote = buildQuote(artifact);
  const price = Number.parseFloat(product.priceUsd);
  const productContract = buildProductContract(product);
  const checks: string[] = [];

  if (product.liveSettlementAllowed !== false) {
    return {
      allowed: false,
      reason: "live_settlement_not_allowed_in_mvp",
      checks: ["All MVP products must keep liveSettlementAllowed=false."],
    };
  }
  checks.push("live settlement disabled");

  if (product.externalSideEffectsAllowed !== false) {
    return {
      allowed: false,
      reason: "external_side_effects_not_allowed",
      checks: ["Paid artifact access cannot trigger scans, sends, trades, or infrastructure mutations."],
    };
  }
  checks.push("external side effects disabled");

  if (typeof input.maxPriceUsd === "number" && price > input.maxPriceUsd) {
    return {
      allowed: false,
      reason: "price_exceeds_max",
      quote,
      productContract,
      checks: [...checks, `price ${price} exceeds maxPriceUsd ${input.maxPriceUsd}`],
    };
  }
  checks.push("price within maxPriceUsd");

  if (typeof input.sessionCapUsd === "number" && price > input.sessionCapUsd) {
    return {
      allowed: false,
      reason: "price_exceeds_session_cap",
      quote,
      productContract,
      checks: [...checks, `price ${price} exceeds sessionCapUsd ${input.sessionCapUsd}`],
    };
  }
  checks.push("price within session cap");

  if (typeof input.dailyCapUsd === "number" && price > input.dailyCapUsd) {
    return {
      allowed: false,
      reason: "price_exceeds_daily_cap",
      quote,
      productContract,
      checks: [...checks, `price ${price} exceeds dailyCapUsd ${input.dailyCapUsd}`],
    };
  }
  checks.push("price within daily cap");

  if (input.allowedSourceIds && input.allowedSourceIds.length > 0) {
    const blocked = artifact.sourceIds.filter((sourceId) => !input.allowedSourceIds?.includes(sourceId));
    if (blocked.length > 0) {
      return {
        allowed: false,
        reason: "source_not_allowed",
        quote,
        productContract,
        blockedSourceIds: blocked,
        checks: [...checks, `blocked source ids: ${blocked.join(", ")}`],
      };
    }
  }
  checks.push("sources allowed by caller");

  const redSources = artifact.sourceIds.filter((sourceId) => getSource(sourceId)?.risk === "red");
  if (redSources.length > 0) {
    return {
      allowed: false,
      reason: "red_source_present",
      quote,
      productContract,
      blockedSourceIds: redSources,
      checks: [...checks, `red sources blocked: ${redSources.join(", ")}`],
    };
  }
  checks.push("no red sources");

  return {
    allowed: true,
    reason: "preflight_passed",
    quote,
    productContract,
    checks,
  };
}

export function buildProductContract(product: Product) {
  return product;
}
