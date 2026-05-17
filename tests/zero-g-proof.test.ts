import { describe, expect, test, vi } from "vitest";
import { createApp } from "../src/app.js";
import { productRoutes, products, sources, streams } from "../src/catalog.js";
import { fetchZeroGProofReadiness, ZERO_G_PROOF_READINESS_SCHEMA_ID } from "../src/adapters/zero-g-proof.js";

const anchorTx = "0x64ff260ccd02aa69fc18d5727eb4530d8774003bc7df63ec7d5cda036fc438ed";
const contract = "0xBaC59b1571b7c7195915c5B36D8A719Ed7182abc";
const anchoredReceiptHash = "0x9739dbd4afb6ab21f15ccb634b49dabc9144550ef06d346cb4e7cd363e74afd1";
const eventTopic0 = "0x4f9731c9d7daffcbb43aa8b824e6fbf322b8b7362bd61bff5ab93e768134763e";

describe("0G proof readiness", () => {
  test("builds a public proof passport from read-only receipt metadata", async () => {
    const report = await fetchZeroGProofReadiness({
      now: new Date("2026-05-17T18:00:00.000Z"),
      fetcher: async () =>
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: "aoe-zero-g-anchor-receipt",
            result: {
              status: "0x1",
              to: contract.toLowerCase(),
              transactionHash: anchorTx,
              blockNumber: "0x1fa656f",
              logs: [
                {
                  address: contract.toLowerCase(),
                  topics: [eventTopic0, anchoredReceiptHash],
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });

    expect(report.schemaId).toBe(ZERO_G_PROOF_READINESS_SCHEMA_ID);
    expect(report.proofPacket.chainId).toBe(16661);
    expect(report.proofPacket.anchorTxHash).toBe(anchorTx);
    expect(report.liveReadback.status).toBe("verified");
    expect(report.liveReadback.receipt.contractMatched).toBe(true);
    expect(report.liveReadback.receipt.expectedTopicMatched).toBe(true);
    expect(report.liveReadback.receipt.anchoredReceiptTopicMatched).toBe(true);
    expect(report.readiness.status).toBe("verified_public_anchor");
    expect(report.readiness.judgeDemoReady).toBe(true);
    expect(report.safety.walletSigningAllowed).toBe(false);
    expect(report.safety.transactionBroadcastAllowed).toBe(false);
    expect(report.safety.proofPostingAllowed).toBe(false);
    expect(report.safety.nodeStartAttempted).toBe(false);
    expect(report.safety.rawComplianceSubjectPublished).toBe(false);
    expect(report.evidenceProof.readinessReportHash).toMatch(/^sha256:/);
  });

  test("registers product, source, stream, and route contracts", () => {
    expect(products.find((product) => product.productId === "zero_g_hackathon_proof_pack")).toEqual(
      expect.objectContaining({
        route: "/v1/hackathon/0g-proof",
        liveSettlementAllowed: false,
        externalSideEffectsAllowed: false,
      }),
    );
    expect(sources.map((source) => source.sourceId)).toContain("zero_g_chain_public_rpc");
    expect(sources.map((source) => source.sourceId)).toContain("zero_guard_hackathon_public_proof");
    expect(streams.find((stream) => stream.streamId === "zero_g_proof_readiness")?.schemaVersion).toBe(ZERO_G_PROOF_READINESS_SCHEMA_ID);
    expect(productRoutes.find((route) => route.routeId === "zero_g_proof_readiness")).toEqual(
      expect.objectContaining({
        route: "/v1/hackathon/0g-proof",
        method: "GET",
        access: "public",
        readiness: "live_read_only",
        schemaId: ZERO_G_PROOF_READINESS_SCHEMA_ID,
      }),
    );
  });

  test("app route exposes the 0G proof passport without signing or settlement", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            result: {
              status: "0x1",
              to: contract.toLowerCase(),
              transactionHash: anchorTx,
              blockNumber: "0x1fa656f",
              logs: [{ address: contract.toLowerCase(), topics: [eventTopic0, anchoredReceiptHash] }],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    try {
      const res = await createApp().request("/v1/hackathon/0g-proof");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.mode).toBe("read_only_zero_g_proof_readiness");
      expect(body.readOnly).toBe(true);
      expect(body.sideEffects).toBe("public_chain_receipt_fetch_only");
      expect(body.report.schemaId).toBe(ZERO_G_PROOF_READINESS_SCHEMA_ID);
      expect(body.report.proofPacket.contractAddress).toBe(contract);
      expect(body.report.safety.walletSigningAllowed).toBe(false);
      expect(body.report.safety.transactionBroadcastAllowed).toBe(false);
      expect(body.report.safety.liveSettlementAllowed).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
