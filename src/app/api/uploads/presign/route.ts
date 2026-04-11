import { NextResponse } from "next/server";
import { getAuthenticatedEditor } from "@/lib/session";
import { createUploadSignature } from "@/storage/presign";

export async function POST(request: Request) {
  const editor = await getAuthenticatedEditor();
  if (!editor) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { fileName?: string; contentType?: string } | null;
  if (!body?.fileName || !body?.contentType) {
    return NextResponse.json({ error: "文件名和内容类型不能为空。" }, { status: 400 });
  }

  const signature = await createUploadSignature(body.fileName, body.contentType);
  return NextResponse.json(signature);
}
