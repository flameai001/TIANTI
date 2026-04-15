import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().optional(),
  SEED_EDITOR_ONE_EMAIL: z.string().email().optional(),
  SEED_EDITOR_ONE_PASSWORD: z.string().min(8).optional(),
  SEED_EDITOR_TWO_EMAIL: z.string().email().optional(),
  SEED_EDITOR_TWO_PASSWORD: z.string().min(8).optional(),
  TIANTI_STORAGE_MODE: z.enum(["mock", "r2"]).optional(),
  TIANTI_CONTENT_MODE: z.enum(["mock", "database"]).optional()
});

const parsedEnv = envSchema.parse(process.env);

export const appEnv = {
  ...parsedEnv,
  contentMode: parsedEnv.TIANTI_CONTENT_MODE ?? "mock",
  storageMode: parsedEnv.TIANTI_STORAGE_MODE ?? "mock",
  editorCredentials: [
    {
      slot: 1,
      email: parsedEnv.SEED_EDITOR_ONE_EMAIL ?? "lin@example.com",
      password: parsedEnv.SEED_EDITOR_ONE_PASSWORD ?? "changeme-one"
    },
    {
      slot: 2,
      email: parsedEnv.SEED_EDITOR_TWO_EMAIL ?? "yu@example.com",
      password: parsedEnv.SEED_EDITOR_TWO_PASSWORD ?? "changeme-two"
    }
  ]
};

function normalizeHttpUrl(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`R2 存储配置错误：${label} 不能为空。`);
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error(`R2 存储配置错误：${label} 不是有效的 URL。`);
  }

  return url.toString().replace(/\/$/, "");
}

export function isMockContentMode() {
  return appEnv.contentMode === "mock" || !appEnv.DATABASE_URL;
}

export function isMockStorageMode() {
  return appEnv.storageMode === "mock";
}

export function getR2StorageConfig() {
  const missing = [
    !appEnv.R2_BUCKET?.trim() ? "R2_BUCKET" : null,
    !appEnv.R2_ENDPOINT?.trim() ? "R2_ENDPOINT" : null,
    !appEnv.R2_ACCESS_KEY_ID?.trim() ? "R2_ACCESS_KEY_ID" : null,
    !appEnv.R2_SECRET_ACCESS_KEY?.trim() ? "R2_SECRET_ACCESS_KEY" : null,
    !appEnv.R2_PUBLIC_BASE_URL?.trim() ? "R2_PUBLIC_BASE_URL" : null
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`R2 存储配置错误：缺少 ${missing.join("、")}。`);
  }

  return {
    bucket: appEnv.R2_BUCKET!.trim(),
    endpoint: normalizeHttpUrl(appEnv.R2_ENDPOINT!, "R2_ENDPOINT"),
    accessKeyId: appEnv.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: appEnv.R2_SECRET_ACCESS_KEY!.trim(),
    publicBaseUrl: normalizeHttpUrl(appEnv.R2_PUBLIC_BASE_URL!, "R2_PUBLIC_BASE_URL")
  };
}

export function getR2StorageSummary() {
  if (isMockStorageMode()) {
    return null;
  }

  try {
    const config = getR2StorageConfig();
    return {
      bucket: config.bucket,
      publicBaseUrl: config.publicBaseUrl,
      error: null
    };
  } catch (error) {
    return {
      bucket: appEnv.R2_BUCKET?.trim() ?? "",
      publicBaseUrl: appEnv.R2_PUBLIC_BASE_URL?.trim() ?? "",
      error: error instanceof Error ? error.message : "R2 存储配置错误。"
    };
  }
}
