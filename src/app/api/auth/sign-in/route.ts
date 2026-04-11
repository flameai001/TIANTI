import { NextResponse } from "next/server";
import { createEditorSession, verifyPassword } from "@/lib/session";
import { getContentRepository } from "@/modules/repository";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "邮箱和密码不能为空。" }, { status: 400 });
  }

  const repository = getContentRepository();
  const editor = await repository.findEditorByEmail(body.email);

  if (!editor) {
    return NextResponse.json({ error: "账号不存在。" }, { status: 401 });
  }

  const valid = await verifyPassword(editor.passwordHash, body.password);
  if (!valid) {
    return NextResponse.json({ error: "密码错误。" }, { status: 401 });
  }

  await createEditorSession(editor.id);
  return NextResponse.json({ ok: true });
}
