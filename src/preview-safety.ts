export const PREVIEW_SAFETY_SCHEMA_ID = "aoe.preview_safety.v1";

export function buildPreviewSafety(recommendedBaseUrl: string) {
  return {
    schemaId: PREVIEW_SAFETY_SCHEMA_ID,
    generatedAt: new Date().toISOString(),
    service: "agent-opportunity-exchange",
    recommendedBaseUrl,
    previewReadyClaim: "Only claim preview-ready after contract, unit, browser-smoke, sellability, and deployed-url smoke checks pass.",
    safety: {
      liveSettlementAllowed: false,
      mainnetFundsAccepted: false,
      externalSideEffectsAllowed: false,
      liveTradingAllowed: false,
      outboundTelegramSendsAllowed: false,
      customerDataRequired: false,
      secretValuesRequiredInRepo: false,
    },
    localVerification: [
      "npm run verify",
      "npm run build",
      "npm run browser:smoke",
      "npm run sellability",
    ],
    deployedPreviewVerification: {
      command: "AOE_BROWSER_SMOKE_BASE_URL=<preview-url> npm run browser:smoke",
      requiresHttps: true,
      startsLocalServer: false,
      proves: [
        "buyer workbench renders",
        "contract bundle is public",
        "simulated x402 payment path fails closed without payment",
        "Telegram registration remains send-disabled",
        "0G proof and compliance previews expose no wallet signing or live settlement",
      ],
    },
    requiredEndpoints: [
      "/health",
      "/.well-known/agent-opportunity-exchange.json",
      "/v1/contracts",
      "/v1/readiness",
      "/v1/x402/status",
      "/v1/buyer-proof",
      "/v1/preview-safety",
    ],
    blockedClaims: [
      "production live payments",
      "mainnet settlement",
      "investment advice or trade execution",
      "Telegram delivery",
      "customer data processing",
      "0G writes, wallet signing, or transaction broadcast",
    ],
  };
}
