export type Cadence =
  | "realtime"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annual"
  | "event_driven";

export type SourceRisk = "green" | "yellow" | "red";

export interface RightsEnvelope {
  licenseId: string;
  allowedUses: string[];
  prohibitedUses: string[];
  cacheTtlSeconds: number;
  maxExtract: string;
  attribution: string;
  privacyClass: string;
  redistribution: string;
}

export interface SourceRecord {
  sourceId: string;
  name: string;
  owner: string;
  url: string;
  accessPattern: "official_api" | "official_download" | "open_data" | "public_docs" | "partner_api";
  cadence: Cadence;
  risk: SourceRisk;
  rights: RightsEnvelope;
  notes: string;
}

export interface Product {
  productId: string;
  x402Stream: true;
  title: string;
  route: string;
  method: "GET" | "POST";
  category: string;
  priceUsd: string;
  artifactKind: string;
  settlementMode: "simulated_or_testnet";
  liveSettlementAllowed: false;
  externalSideEffectsAllowed: false;
  tags: string[];
  sourceIds: string[];
  buyerValue: string;
  disclaimers: string[];
}

export interface StreamDefinition {
  streamId: string;
  productId: string;
  x402Stream: true;
  title: string;
  route: string;
  method: "GET" | "POST";
  previewPriceUsd: string;
  schemaVersion: string;
  settlementMode: "simulated_or_testnet";
  liveSettlementAllowed: false;
  externalSideEffectsAllowed: false;
  sourceIds: string[];
  tags: string[];
  inputSchema: Record<string, unknown>;
  outputSummary: string;
  caveats: string[];
}

export interface ArtifactPreview {
  headline: string;
  audience: string[];
  dataPoints: string[];
  sampleQuestions: string[];
  freshness: {
    class: Cadence;
    ttlSeconds: number;
    lastVerified: string;
  };
}

export interface ArtifactContent {
  summary: string;
  evidenceCards: Array<{
    title: string;
    sourceIds: string[];
    finding: string;
    action: string;
  }>;
  nextActions: string[];
  caveats: string[];
  outputPolicy: string[];
}

export interface Artifact {
  artifactId: string;
  productId: string;
  x402Stream: true;
  title: string;
  category: string;
  description: string;
  tags: string[];
  sourceIds: string[];
  rights: RightsEnvelope;
  preview: ArtifactPreview;
  content: ArtifactContent;
}

export interface SeparateWorkstream {
  workstreamId: string;
  title: string;
  category: string;
  x402Stream: false;
  tags: string[];
  sourceIds: string[];
  publicPreviewEndpoints: string[];
  boundary: string[];
  status: "separate_read_only_lane" | "planned";
}

export interface Quote {
  quoteId: string;
  workOrderId: string;
  artifactId: string;
  productId: string;
  priceUsd: string;
  currency: "USDC";
  paymentProtocol: "x402";
  settlementMode: "simulated_or_testnet";
  liveSettlementAllowed: false;
  expiresAt: string;
  accepted: Array<{
    scheme: "exact";
    network: string;
    asset: "USDC";
    amountUsd: string;
    payTo: string;
  }>;
  rights: RightsEnvelope;
  sourceIds: string[];
}

export interface Receipt {
  receiptId: string;
  quoteId: string;
  workOrderId: string;
  artifactId: string;
  productId: string;
  settlementMode: "simulated_or_testnet";
  liveSettlementAllowed: false;
  paidAt: string;
  artifactHash: string;
  sourceIds: string[];
  rights: RightsEnvelope;
}
