import { HTTPFacilitatorClient } from "@x402/core/server";
import type { HTTPRequestContext, RoutesConfig } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddlewareFromHTTPServer, x402HTTPResourceServer, x402ResourceServer } from "@x402/hono";
import type { MiddlewareHandler } from "hono";
import { getArtifact, getProduct } from "./catalog.js";
import { sha256, shortHash } from "./hash.js";
import { appendReceipt } from "./ledger.js";
import { buildQuote, buildReceipt, paymentRequiredPayload } from "./payments.js";
import { getReadyX402TestnetConfig, getX402PaymentStatus, type X402PaymentStatus } from "./x402-config.js";

export interface X402Gate {
  status: X402PaymentStatus;
  gateActive: boolean;
  middleware?: MiddlewareHandler;
}

export function createX402TestnetGate(): X402Gate {
  const status = getX402PaymentStatus();
  const config = getReadyX402TestnetConfig();
  if (!config) {
    return { status, gateActive: false };
  }

  const facilitatorClient = new HTTPFacilitatorClient({ url: config.facilitatorUrl });
  const resourceServer = new x402ResourceServer(facilitatorClient)
    .register(config.network, new ExactEvmScheme())
    .onAfterSettle(async (context) => {
      const path = pathFromTransportContext(context.transportContext);
      const artifact = path ? getArtifactIdFromPath(path) : null;
      if (!artifact) return;

      const quote = buildQuote(artifact);
      const receipt = buildReceipt(artifact, quote, new Date(), {
        rail: "official_x402_testnet",
        status: "settled",
        network: context.result.network,
        amount: context.result.amount,
        asset: context.requirements.asset,
        payer: context.result.payer,
        transaction: context.result.transaction,
        facilitatorUrl: config.facilitatorUrl,
        paymentResponseHash: sha256({
          transaction: context.result.transaction,
          network: context.result.network,
          amount: context.result.amount,
          payer: context.result.payer,
        }),
        liveSettlementAllowed: false,
      });
      await appendReceipt(receipt);
    });

  const routes: RoutesConfig = {
    "GET /v1/artifacts/:id/content": {
      accepts: {
        scheme: "exact",
        network: config.network,
        payTo: config.payTo,
        price: (context) => {
          const artifact = getArtifactIdFromPath(context.path);
          if (!artifact) return "$0.000001";
          const product = getProduct(artifact.productId);
          if (!product) throw new Error(`Product not found for artifact ${artifact.artifactId}`);
          return `$${product.priceUsd}`;
        },
        maxTimeoutSeconds: 300,
        extra: {
          product: "agent-opportunity-exchange",
          rights: "derived_analysis_metadata_and_source_links_only",
        },
      },
      description: "Agent Opportunity Exchange paid artifact content. Testnet-only x402 on Base Sepolia.",
      mimeType: "application/json",
      unpaidResponseBody: (context) => {
        const artifact = getArtifactIdFromPath(context.path);
        if (!artifact) {
          return {
            contentType: "application/json",
            body: { error: "artifact_not_found" },
          };
        }
        return {
          contentType: "application/json",
          body: paymentRequiredPayload(buildQuote(artifact), { officialX402Testnet: true }),
        };
      },
      settlementFailedResponseBody: (_context, settleResult) => ({
        contentType: "application/json",
        body: {
          error: "x402_testnet_settlement_failed",
          reason: settleResult.errorReason,
          message: settleResult.errorMessage,
          liveSettlementAllowed: false,
        },
      }),
    },
  };

  const httpServer = new x402HTTPResourceServer(resourceServer, routes).onProtectedRequest(async (context) => {
    const artifact = getArtifactIdFromPath(context.path);
    if (!artifact) return { grantAccess: true };
    if (!artifact.x402Stream) return { abort: true, reason: "artifact_not_x402_stream" };
    return undefined;
  });

  return {
    status,
    gateActive: true,
    middleware: paymentMiddlewareFromHTTPServer(
      httpServer,
      {
        appName: "Agent Opportunity Exchange",
        testnet: true,
      },
      undefined,
      true,
    ),
  };
}

function getArtifactIdFromPath(path: string) {
  const match = path.match(/^\/v1\/artifacts\/([^/]+)\/content$/);
  if (!match) return null;
  return getArtifact(decodeURIComponent(match[1]));
}

function pathFromTransportContext(transportContext: unknown): string | null {
  const request = (transportContext as { request?: Partial<HTTPRequestContext> } | undefined)?.request;
  if (typeof request?.path === "string") return request.path;
  return null;
}
