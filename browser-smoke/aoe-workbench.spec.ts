import { expect, test } from "@playwright/test";

test("buyer workbench proves x402 posture before paid access", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/");

  await expect(page).toHaveTitle("Agent Opportunity Exchange - Evidence Streams");
  await expect(page.locator("#workbench")).toBeVisible();
  await expect(page.locator("#routeLabel")).toContainText("/v1/streams/market-context/live-proof");
  await expect(page.locator("#schemaLabel")).toContainText("aoe.market_live_upstream_proof.v1");
  await expect(page.locator("#proofSummary")).toContainText("Mock Data");
  await expect(page.locator("#proofSummary")).toContainText("Evidence Hash");
  await expect(page.locator("#x402Rail")).toContainText(/simulated|Base Sepolia testnet|config needed/);
  await expect(page.locator("#paymentRailMap")).toContainText("solana-pay-sh-svm-candidate");
  await expect(page.locator("#paymentRailMap")).toContainText("Pay.sh / Solana provider catalog");
  await expect(page.locator("#paymentRailMap")).toContainText("liveProviderCredentialsAllowed=false");
  await expect(page.locator('a[href="/telegram"]')).toBeVisible();
  await expect(page.locator("#telegramRail")).toContainText("sends=false");
  await expect(page.locator("#telegramRail")).toContainText("webhooks=false");

  await page.getByRole("button", { name: "Show Contracts" }).click();
  await expect(page.locator("#output")).toContainText("Buyer contract bundle");
  await expect(page.locator("#output")).toContainText("paySh");
  await expect(page.locator("#output")).toContainText("liveSettlementAllowed");

  await page.selectOption("#previewKind", "cyberExpertBrief");
  await page.getByRole("button", { name: "Run Preview" }).click();
  await expect(page.locator("#output")).toContainText("Cyber Expert Case Brief public preview");
  await expect(page.locator("#output")).toContainText("includePublicCveRefresh");
  await expect(page.locator("#output")).toContainText("blockedActions");
  await expect(page.locator("#output")).toContainText("activeScanningAllowed");

  await page.selectOption("#previewKind", "complianceDecision");
  await page.getByRole("button", { name: "Run Preview" }).click();
  await expect(page.locator("#output")).toContainText("Commitment Compliance Proof public preview");
  await expect(page.locator("#output")).toContainText("rawWalletAddressAccepted");
  await expect(page.locator("#output")).toContainText("onChainProofPosted");
  await expect(page.locator("#output")).not.toContainText("0x1111111111111111111111111111111111111111");

  await page.getByRole("button", { name: "Run 0G Proof" }).click();
  await expect(page.locator("#output")).toContainText("0G Proof Passport public preview");
  await expect(page.locator("#output")).toContainText("aoe.zero_g_proof_readiness.v1");
  await expect(page.locator("#output")).toContainText("zero_g_hackathon_proof_pack");
  await expect(page.locator("#output")).toContainText("walletSigningAllowed");
  await expect(page.locator("#output")).toContainText("transactionBroadcastAllowed");

  await page.getByRole("button", { name: "Inspect Featured Proof" }).click();
  await expect(page.locator("#output")).toContainText("Product proof:");
  await expect(page.locator("#output")).toContainText("market_regime_evidence_pack");
  await expect(page.locator("#output")).toContainText("quote");

  const artifactsResponse = await page.request.get("/v1/artifacts");
  expect(artifactsResponse.ok()).toBe(true);
  const artifactsBody = (await artifactsResponse.json()) as {
    artifacts: Array<{ artifactId: string; x402Stream: boolean }>;
  };
  const paidArtifact = artifactsBody.artifacts.find((artifact) => artifact.x402Stream);
  expect(paidArtifact).toBeTruthy();

  const contentResponse = await page.request.get(`/v1/artifacts/${paidArtifact?.artifactId}/content`);
  expect(contentResponse.status()).toBe(402);
  expect(contentResponse.headers()["payment-required"]).toBeTruthy();
  const paymentRequired = (await contentResponse.json()) as {
    protocol: string;
    liveSettlementAllowed: boolean;
    instructions: string[];
  };
  expect(paymentRequired.protocol).toBe("x402");
  expect(paymentRequired.liveSettlementAllowed).toBe(false);
  expect(paymentRequired.instructions.join(" ")).toContain("X-AOE-Payment");

  const telegramResponse = await page.request.get("/v1/telegram/status");
  expect(telegramResponse.ok()).toBe(true);
  const telegramStatus = (await telegramResponse.json()) as {
    schemaId: string;
    outboundTelegramSendsAllowed: boolean;
    webhookRegistrationAllowed: boolean;
  };
  expect(telegramStatus.schemaId).toBe("aoe.telegram.status.v1");
  expect(telegramStatus.outboundTelegramSendsAllowed).toBe(false);
  expect(telegramStatus.webhookRegistrationAllowed).toBe(false);

  const previewSafetyResponse = await page.request.get("/v1/preview-safety");
  expect(previewSafetyResponse.ok()).toBe(true);
  const previewSafety = (await previewSafetyResponse.json()) as {
    schemaId: string;
    deployedPreviewVerification: { command: string; startsLocalServer: boolean };
    safety: { liveSettlementAllowed: boolean; outboundTelegramSendsAllowed: boolean };
  };
  expect(previewSafety.schemaId).toBe("aoe.preview_safety.v1");
  expect(previewSafety.deployedPreviewVerification.command).toContain("AOE_BROWSER_SMOKE_BASE_URL=<preview-url>");
  expect(previewSafety.deployedPreviewVerification.startsLocalServer).toBe(false);
  expect(previewSafety.safety.liveSettlementAllowed).toBe(false);
  expect(previewSafety.safety.outboundTelegramSendsAllowed).toBe(false);

  await page.goto("/telegram");
  await expect(page.locator("#contextState")).toContainText("open inside Telegram");
  await expect(page.locator("#register")).toBeDisabled();

  expect(consoleErrors).toEqual([]);
});
