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

export function isMockContentMode() {
  return appEnv.contentMode === "mock" || !appEnv.DATABASE_URL;
}

export function isMockStorageMode() {
  return appEnv.storageMode === "mock" || !appEnv.R2_BUCKET || !appEnv.R2_ENDPOINT;
}
