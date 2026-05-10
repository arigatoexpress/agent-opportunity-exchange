import { defineConfig, devices } from "@playwright/test";

const port = Number.parseInt(process.env.AOE_BROWSER_SMOKE_PORT ?? "4412", 10);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./browser-smoke",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `AOE_HOST=127.0.0.1 AOE_PORT=${port} npm run serve:smoke`,
    url: `${baseURL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
