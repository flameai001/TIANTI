import { NextResponse } from "next/server";
import { getAuthenticatedEditor } from "@/lib/session";
import { saveAsset } from "@/modules/admin/mutations";

export async function POST(request: Request) {
  const editor = await getAuthenticatedEditor();
  if (!editor) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  try {
    const asset = await saveAsset(await request.json());
    return NextResponse.json({ asset });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "素材保存失败。" },
      { status: 400 }
    );
  }
}
