import { NextResponse } from "next/server";
import { resetMockState } from "@/modules/repository/mock-store";

export async function POST() {
  if (process.env.TIANTI_E2E !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  resetMockState();
  return NextResponse.json({ ok: true });
}
