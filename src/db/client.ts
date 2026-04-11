import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { appEnv } from "@/lib/env";

declare global {
  var __tiantiSql: postgres.Sql | undefined;
}

export function getDb() {
  if (!appEnv.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in database mode.");
  }

  const sql =
    globalThis.__tiantiSql ??
    postgres(appEnv.DATABASE_URL, {
      max: 1
    });

  globalThis.__tiantiSql = sql;

  return drizzle(sql);
}
