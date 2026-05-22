import { sha256 } from "../hash.js";

export const ZERO_G_PROOF_READINESS_SCHEMA_ID = "aoe.zero_g_proof_readiness.v1";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface ZeroGProofReadinessOptions {
  fetcher?: FetchLike;
  timeoutMs?: number;
  now?: Date;
  rpcUrl?: string;
}

interface JsonRpcReceipt {
  status?: string;
  to?: string | null;
  transactionHash?: string;
  blockNumber?: string;
  logs?: Array<{
    address?: string;
    topics?: string[];
  }>;
}

interface JsonRpcReceiptResponse {
  result?: JsonRpcReceipt | null;
  error?: {
    code?: number;
    message?: string;
  };
}

const ZERO_G_RPC_URL = "https://evmrpc.0g.ai";
const ZERO_G_EXPLORER_URL = "https://chainscan.0g.ai";
const ZERO_G_CHAIN_ID = 16661;
const ZERO_G_CHAIN_NAME = "0G mainnet";
const ZERO_G_CONTRACT_ADDRESS = "0xBaC59b1571b7c7195915c5B36D8A719Ed7182abc";
const ZERO_G_ANCHOR_TX_HASH = "0x64ff260ccd02aa69fc18d5727eb4530d8774003bc7df63ec7d5cda036fc438ed";
const ZERO_G_ANCHOR_RECEIPT_HASH = "0x9739dbd4afb6ab21f15ccb634b49dabc9144550ef06d346cb4e7cd363e74afd1";
const ZERO_G_RECEIPT_TOPIC0 = "0x4f9731c9d7daffcbb43aa8b824e6fbf322b8b7362bd61bff5ab93e768134763e";
const ZERO_G_DEPLOY_TX_HASH = "0xd4c1d5f947cb7bae14c581072602976f14fdfaab1474c9fd7bd4d87fa0f5303b";
const ZERO_G_PROOF_PAGE = "https://arigatoexpress.github.io/0guard/hackathon-0g/";
const ZERO_G_MAINNET_PROOF_JSON = "https://arigatoexpress.github.io/0guard/hackathon-0g/mainnet-proof.json";
const ZERO_G_HACKQUEST_PROOF_JSON = "https://arigatoexpress.github.io/0guard/hackathon-0g/hackquest-submission-proof.json";

const staticProofPacket = {
  sourceProject: "0guard",
  sourceSchema: "0guard.mainnet_proof.v1",
  generatedAtUtc: "2026-05-14T03:07:03Z",
  hackquestSubmissionVerifiedAtUtc: "2026-05-16T15:30:01Z",
  chainId: ZERO_G_CHAIN_ID,
  chainName: ZERO_G_CHAIN_NAME,
  rpcUrl: ZERO_G_RPC_URL,
  explorerUrl: ZERO_G_EXPLORER_URL,
  contractAddress: ZERO_G_CONTRACT_ADDRESS,
  deployTxHash: ZERO_G_DEPLOY_TX_HASH,
  anchorTxHash: ZERO_G_ANCHOR_TX_HASH,
  anchoredReceiptHash: ZERO_G_ANCHOR_RECEIPT_HASH,
  anchorDecision: "deny",
  anchorSeverity: "critical",
  anchorAgentId: "agent-7857-demo",
  expectedEventTopic0: ZERO_G_RECEIPT_TOPIC0,
  publicProofPage: ZERO_G_PROOF_PAGE,
  publicProofJson: ZERO_G_MAINNET_PROOF_JSON,
  publicHackquestProofJson: ZERO_G_HACKQUEST_PROOF_JSON,
};

export interface ZeroGProofReadinessReport {
  schemaId: typeof ZERO_G_PROOF_READINESS_SCHEMA_ID;
  generatedAt: string;
  mode: "read_only_zero_g_proof_readiness";
  x402Stream: true;
  productId: "zero_g_hackathon_proof_pack";
  readOnly: true;
  sideEffects: "public_chain_receipt_fetch_only";
  sourceIds: Array<"zero_g_chain_public_rpc" | "zero_guard_hackathon_public_proof" | "ofac_sanctions_lists" | "trm_sanctions_docs">;
  proofPacket: typeof staticProofPacket;
  liveReadback: {
    attempted: boolean;
    sourceId: "zero_g_chain_public_rpc";
    rpcMethod: "eth_getTransactionReceipt";
    status: "verified" | "degraded" | "not_found";
    durationMs: number;
    errorCode: string | null;
    receipt: {
      status: string | null;
      to: string | null;
      transactionHash: string | null;
      blockNumber: string | null;
      contractMatched: boolean;
      successStatus: boolean;
      expectedTopicMatched: boolean;
      anchoredReceiptTopicMatched: boolean;
      logCount: number;
    };
  };
  readiness: {
    status: "verified_public_anchor" | "degraded_static_proof_only" | "anchor_receipt_missing";
    judgeDemoReady: boolean;
    publicProofUrlsReachableByBrowser: string[];
    reusableForAoe: string[];
    operatorNextSteps: string[];
  };
  safety: {
    walletSigningAllowed: false;
    transactionBroadcastAllowed: false;
    proofPostingAllowed: false;
    nodeStartAttempted: false;
    secretValuesEchoed: false;
    rawWalletSubjectAccepted: false;
    rawComplianceSubjectPublished: false;
    liveSettlementAllowed: false;
    externalSideEffectsAllowed: false;
    activeScanningAllowed: false;
    sanctionsClearanceClaimed: false;
    outputPolicy: string[];
  };
  caveats: string[];
  evidenceProof: {
    algorithm: "sha256";
    canonicalization: "stable-json-sorted-keys-v1";
    staticProofPacketHash: string;
    liveReceiptHash: string | null;
    readinessReportHash: string;
  };
}

export async function fetchZeroGProofReadiness(options: ZeroGProofReadinessOptions = {}): Promise<ZeroGProofReadinessReport> {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const started = Date.now();
  const receiptResult = await fetchAnchorReceipt(options.fetcher ?? fetch, options.rpcUrl ?? ZERO_G_RPC_URL, options.timeoutMs ?? 5_000);
  const durationMs = Date.now() - started;
  const receipt = summarizeReceipt(receiptResult.receipt);
  const readbackStatus: ZeroGProofReadinessReport["liveReadback"]["status"] = receiptResult.errorCode
    ? "degraded"
    : receipt.successStatus && receipt.contractMatched
      ? "verified"
      : "not_found";
  const sourceIds: ZeroGProofReadinessReport["sourceIds"] = [
    "zero_g_chain_public_rpc",
    "zero_guard_hackathon_public_proof",
    "ofac_sanctions_lists",
    "trm_sanctions_docs",
  ];
  const withoutProof = {
    schemaId: ZERO_G_PROOF_READINESS_SCHEMA_ID as typeof ZERO_G_PROOF_READINESS_SCHEMA_ID,
    generatedAt,
    mode: "read_only_zero_g_proof_readiness" as const,
    x402Stream: true as const,
    productId: "zero_g_hackathon_proof_pack" as const,
    readOnly: true as const,
    sideEffects: "public_chain_receipt_fetch_only" as const,
    sourceIds,
    proofPacket: staticProofPacket,
    liveReadback: {
      attempted: true,
      sourceId: "zero_g_chain_public_rpc" as const,
      rpcMethod: "eth_getTransactionReceipt" as const,
      status: readbackStatus,
      durationMs,
      errorCode: receiptResult.errorCode,
      receipt,
    },
    readiness: buildReadinessSummary(readbackStatus),
    safety: {
      walletSigningAllowed: false as const,
      transactionBroadcastAllowed: false as const,
      proofPostingAllowed: false as const,
      nodeStartAttempted: false as const,
      secretValuesEchoed: false as const,
      rawWalletSubjectAccepted: false as const,
      rawComplianceSubjectPublished: false as const,
      liveSettlementAllowed: false as const,
      externalSideEffectsAllowed: false as const,
      activeScanningAllowed: false as const,
      sanctionsClearanceClaimed: false as const,
      outputPolicy: [
        "Publish contract addresses, transaction hashes, receipt hashes, source URLs, and readiness status only.",
        "Do not publish raw wallet screening subjects, private TRM/KYT payloads, secrets, customer identifiers, or private inventory.",
        "Use commitments, policy versions, expiry, and source roots for future compliance proof lanes.",
        "This route may read a public receipt but never signs, broadcasts, posts proofs, starts a node, or moves funds.",
      ],
    },
    caveats: [
      "This is a public proof-readiness packet, not a new 0G write.",
      "Live readback is limited to eth_getTransactionReceipt for an already-public 0guard anchor transaction.",
      "0G node operation on Windows remains a separate guarded runtime lane and is not started by AOE.",
      "TRM and OFAC are included as proof-design sources only; no live sanctions screening or clearance claim is made.",
    ],
  };

  return {
    ...withoutProof,
    evidenceProof: {
      algorithm: "sha256",
      canonicalization: "stable-json-sorted-keys-v1",
      staticProofPacketHash: sha256(staticProofPacket),
      liveReceiptHash: receiptResult.receipt ? sha256(receiptResult.receipt) : null,
      readinessReportHash: sha256(withoutProof),
    },
  };
}

async function fetchAnchorReceipt(fetcher: FetchLike, rpcUrl: string, timeoutMs: number): Promise<{ receipt: JsonRpcReceipt | null; errorCode: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(rpcUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "aoe-zero-g-anchor-receipt",
        method: "eth_getTransactionReceipt",
        params: [ZERO_G_ANCHOR_TX_HASH],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { receipt: null, errorCode: `http_${response.status}` };
    const body = (await response.json().catch(() => null)) as JsonRpcReceiptResponse | null;
    if (!body) return { receipt: null, errorCode: "invalid_json" };
    if (body.error) return { receipt: null, errorCode: `json_rpc_${body.error.code ?? "error"}` };
    return { receipt: body.result ?? null, errorCode: null };
  } catch (error) {
    return { receipt: null, errorCode: error instanceof Error ? error.name || "fetch_error" : "fetch_error" };
  } finally {
    clearTimeout(timer);
  }
}

function summarizeReceipt(receipt: JsonRpcReceipt | null): ZeroGProofReadinessReport["liveReadback"]["receipt"] {
  const topics = receipt?.logs?.flatMap((log) => log.topics ?? []) ?? [];
  return {
    status: receipt?.status ?? null,
    to: receipt?.to ?? null,
    transactionHash: receipt?.transactionHash ?? null,
    blockNumber: receipt?.blockNumber ?? null,
    contractMatched: normalizeAddress(receipt?.to) === normalizeAddress(ZERO_G_CONTRACT_ADDRESS),
    successStatus: receipt?.status === "0x1",
    expectedTopicMatched: topics.includes(ZERO_G_RECEIPT_TOPIC0),
    anchoredReceiptTopicMatched: topics.includes(ZERO_G_ANCHOR_RECEIPT_HASH),
    logCount: receipt?.logs?.length ?? 0,
  };
}

function buildReadinessSummary(status: "verified" | "degraded" | "not_found"): ZeroGProofReadinessReport["readiness"] {
  const verified = status === "verified";
  return {
    status: verified ? "verified_public_anchor" : status === "not_found" ? "anchor_receipt_missing" : "degraded_static_proof_only",
    judgeDemoReady: verified,
    publicProofUrlsReachableByBrowser: [ZERO_G_PROOF_PAGE, ZERO_G_MAINNET_PROOF_JSON, ZERO_G_HACKQUEST_PROOF_JSON],
    reusableForAoe: [
      "Attach 0G proof-readiness to compliance decision previews without posting raw wallet subjects.",
      "Use 0guard anchor receipts as public demonstration evidence for the hackathon story.",
      "Keep AOE as the buyer-facing contract and proof router while 0guard remains the specialized on-chain proof demo.",
    ],
    operatorNextSteps: verified
      ? [
          "Record this route in the demo flow and Cloud Run smoke tests.",
          "Add a future gated proof-post route only after signer custody, replay protection, and human approval are designed.",
          "Keep Windows 0G node operation separate from AOE public API runtime.",
        ]
      : [
          "Use the static public proof packet for demo continuity while investigating 0G RPC reachability.",
          "Do not claim fresh live readback until eth_getTransactionReceipt returns the expected receipt.",
        ],
  };
}

function normalizeAddress(value: string | null | undefined): string {
  return (value ?? "").toLowerCase();
}
