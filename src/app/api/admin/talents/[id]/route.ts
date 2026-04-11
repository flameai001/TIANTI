import { NextResponse } from "next/server";
import { getAuthenticatedEditor } from "@/lib/session";
import { removeTalent, saveTalent } from "@/modules/admin/mutations";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const editor = await getAuthenticatedEditor();
  if (!editor) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const talent = await saveTalent({ ...(await request.json()), id });
    return NextResponse.json({ talent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败。" },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const editor = await getAuthenticatedEditor();
  if (!editor) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await removeTalent(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败。" },
      { status: 400 }
    );
  }
}
