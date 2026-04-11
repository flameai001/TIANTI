import { NextResponse } from "next/server";
import { destroyEditorSession } from "@/lib/session";

export async function POST() {
  await destroyEditorSession();
  return NextResponse.json({ ok: true });
}
