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
  await expect(page.locator("#x402Rail")).toContainText(/simulated|Base Sepolia testnet|config needed/);
  await expect(page.locator("#paymentRailMap")).toContainText("solana-pay-sh-svm-candidate");
  await expect(page.locator("#paymentRailMap")).toContainText("Pay.sh / Solana provider catalog");
  await expect(page.locator("#paymentRailMap")).toContainText("liveProviderCredentialsAllowed=false");

  await page.getByRole("button", { name: "Show Contracts" }).click();
  await expect(page.locator("#output")).toContainText("Buyer contract bundle");
  await expect(page.locator("#output")).toContainText("paySh");
  await expect(page.locator("#output")).toContainText("liveSettlementAllowed");

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

  expect(consoleErrors).toEqual([]);
});
