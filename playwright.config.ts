import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry"
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    env: {
      ...process.env,
      TIANTI_CONTENT_MODE: "mock",
      TIANTI_STORAGE_MODE: "mock",
      TIANTI_E2E: "1",
      SEED_EDITOR_ONE_EMAIL: "lin@example.com",
      SEED_EDITOR_ONE_PASSWORD: "changeme-one",
      SEED_EDITOR_TWO_EMAIL: "yu@example.com",
      SEED_EDITOR_TWO_PASSWORD: "changeme-two"
    }
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
