import { NextResponse } from "next/server";
import { getAuthenticatedEditor } from "@/lib/session";
import { saveTalentBulk } from "@/modules/admin/mutations";

export async function POST(request: Request) {
  const editor = await getAuthenticatedEditor();
  if (!editor) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  try {
    const result = await saveTalentBulk(await request.json());
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批量操作失败。" },
      { status: 400 }
    );
  }
}
