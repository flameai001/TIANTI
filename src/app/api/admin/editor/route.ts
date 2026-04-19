import { NextResponse } from "next/server";
import { getAuthenticatedEditor } from "@/lib/session";
import { saveEditorName } from "@/modules/admin/mutations";
import type { EditorProfile } from "@/modules/domain/types";

function serializeEditor(editor: EditorProfile) {
  return {
    id: editor.id,
    slug: editor.slug,
    name: editor.name,
    title: editor.title,
    bio: editor.bio,
    accent: editor.accent,
    intro: editor.intro
  };
}

export async function PUT(request: Request) {
  const editor = await getAuthenticatedEditor();
  if (!editor) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  try {
    const nextEditor = await saveEditorName(editor.id, await request.json());
    return NextResponse.json({ editor: serializeEditor(nextEditor) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败。" },
      { status: 400 }
    );
  }
}
