import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: ["browser-smoke/**", "dist/**", "node_modules/**", "playwright-report/**", "test-results/**"],
  },
});
