import { NextResponse } from "next/server";
import { appEnv } from "@/lib/env";
import { cleanupOrphanedAssets } from "@/modules/assets/cleanup";

export async function GET(request: Request) {
  if (!appEnv.cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is required before cron cleanup can run." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${appEnv.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await cleanupOrphanedAssets();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Failed to clean orphaned assets.", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to clean orphaned assets." },
      { status: 500 }
    );
  }
}
