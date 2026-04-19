import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  },
  z.string().optional()
);

const optionalPositiveInteger = z.preprocess(
  (value) => {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  },
  z.coerce.number().int().positive().optional()
);

const envSchema = z.object({
  CRON_SECRET: optionalNonEmptyString,
  DATABASE_URL: z.string().optional(),
  ORPHAN_ASSET_CLEANUP_LIMIT: optionalPositiveInteger,
  ORPHAN_ASSET_GRACE_MINUTES: optionalPositiveInteger,
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

const defaultEditorCredentials = [
  {
    slot: 1,
    email: "lin@example.com",
    password: "changeme-one"
  },
  {
    slot: 2,
    email: "yu@example.com",
    password: "changeme-two"
  }
] as const;

export const appEnv = {
  ...parsedEnv,
  contentMode: parsedEnv.TIANTI_CONTENT_MODE ?? "mock",
  cronSecret: parsedEnv.CRON_SECRET?.trim() ?? null,
  orphanAssetCleanupLimit: parsedEnv.ORPHAN_ASSET_CLEANUP_LIMIT ?? 50,
  orphanAssetGraceMinutes: parsedEnv.ORPHAN_ASSET_GRACE_MINUTES ?? 30,
  storageMode: parsedEnv.TIANTI_STORAGE_MODE ?? "mock"
};

function resolveSeedEditorCredential(
  slot: 1 | 2,
  email: string | undefined,
  password: string | undefined,
  allowDefaults: boolean
) {
  const fallback = defaultEditorCredentials[slot - 1];
  const normalizedEmail = email?.trim();
  const normalizedPassword = password?.trim();

  if (normalizedEmail && normalizedPassword) {
    return {
      slot,
      email: normalizedEmail,
      password: normalizedPassword
    };
  }

  if (allowDefaults) {
    return { ...fallback };
  }

  const label = slot === 1 ? "ONE" : "TWO";
  const missing = [
    !normalizedEmail ? `SEED_EDITOR_${label}_EMAIL` : null,
    !normalizedPassword ? `SEED_EDITOR_${label}_PASSWORD` : null
  ].filter(Boolean);

  throw new Error(
    `Missing ${missing.join(", ")}. Set explicit editor seed credentials before running seeded non-mock content flows.`
  );
}

export function getSeedEditorCredentials(options: { allowDefaults?: boolean } = {}) {
  const allowDefaults = options.allowDefaults ?? false;

  return [
    resolveSeedEditorCredential(
      1,
      parsedEnv.SEED_EDITOR_ONE_EMAIL,
      parsedEnv.SEED_EDITOR_ONE_PASSWORD,
      allowDefaults
    ),
    resolveSeedEditorCredential(
      2,
      parsedEnv.SEED_EDITOR_TWO_EMAIL,
      parsedEnv.SEED_EDITOR_TWO_PASSWORD,
      allowDefaults
    )
  ] as const;
}

function normalizeHttpUrl(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Invalid R2 config: ${label} cannot be empty.`);
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error(`Invalid R2 config: ${label} must be a valid URL.`);
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
    throw new Error(`Invalid R2 config: missing ${missing.join(", ")}.`);
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
      error: error instanceof Error ? error.message : "Invalid R2 config."
    };
  }
}

export function getOrphanAssetCleanupConfig() {
  return {
    graceMinutes: appEnv.orphanAssetGraceMinutes,
    limit: appEnv.orphanAssetCleanupLimit
  };
}
