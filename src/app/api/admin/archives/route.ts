import { NextResponse } from "next/server";
import { getAuthenticatedEditor } from "@/lib/session";
import { saveArchive } from "@/modules/admin/mutations";

export async function PUT(request: Request) {
  const editor = await getAuthenticatedEditor();
  if (!editor) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  try {
    const archive = await saveArchive(editor.id, await request.json());
    return NextResponse.json({ archive });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败。" },
      { status: 400 }
    );
  }
}
