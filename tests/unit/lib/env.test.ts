import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function loadEnvModule(overrides: Record<string, string | undefined>) {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV, ...overrides };
  return import("@/lib/env");
}

describe("env helpers", () => {
  afterEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  it("normalizes R2 URLs without a protocol prefix", async () => {
    const { getR2StorageConfig } = await loadEnvModule({
      TIANTI_STORAGE_MODE: "r2",
      R2_BUCKET: "tianti-assets",
      R2_ENDPOINT: "abc123.r2.cloudflarestorage.com",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_PUBLIC_BASE_URL: "cdn.example.com/uploads/"
    });

    const config = getR2StorageConfig();
    expect(config.endpoint).toBe("https://abc123.r2.cloudflarestorage.com");
    expect(config.publicBaseUrl).toBe("https://cdn.example.com/uploads");
  });

  it("throws a clear error for invalid R2 URLs", async () => {
    const { getR2StorageConfig } = await loadEnvModule({
      TIANTI_STORAGE_MODE: "r2",
      R2_BUCKET: "tianti-assets",
      R2_ENDPOINT: "http://",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_PUBLIC_BASE_URL: "cdn.example.com/uploads"
    });

    expect(() => getR2StorageConfig()).toThrow("R2_ENDPOINT");
  });

  it("returns the orphan asset cleanup defaults when env vars are unset", async () => {
    const { getOrphanAssetCleanupConfig } = await loadEnvModule({
      CRON_SECRET: undefined,
      ORPHAN_ASSET_CLEANUP_LIMIT: undefined,
      ORPHAN_ASSET_GRACE_MINUTES: undefined
    });

    expect(getOrphanAssetCleanupConfig()).toEqual({
      graceMinutes: 30,
      limit: 50
    });
  });
});
