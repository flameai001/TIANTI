import { NextResponse } from "next/server";
import { z } from "zod";
import { isMockStorageMode } from "@/lib/env";
import { getAuthenticatedEditor } from "@/lib/session";
import { saveAsset } from "@/modules/admin/mutations";
import { uploadObjectToR2 } from "@/storage/r2";

const assetSchema = z.object({
  kind: z.enum(["talent_cover", "talent_representation", "event_scene", "shared_photo"]),
  title: z.string().min(1),
  alt: z.string().min(1),
  width: z.coerce.number().int().positive(),
  height: z.coerce.number().int().positive()
});

export async function POST(request: Request) {
  const editor = await getAuthenticatedEditor();
  if (!editor) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请先选择图片文件。" }, { status: 400 });
    }

    if (isMockStorageMode()) {
      return NextResponse.json({ error: "当前环境还没有启用真实对象存储。" }, { status: 400 });
    }

    const meta = assetSchema.parse({
      kind: formData.get("kind"),
      title: formData.get("title"),
      alt: formData.get("alt"),
      width: formData.get("width"),
      height: formData.get("height")
    });

    const uploaded = await uploadObjectToR2(
      file.name,
      file.type || "application/octet-stream",
      new Uint8Array(await file.arrayBuffer())
    );

    const asset = await saveAsset({
      ...meta,
      url: uploaded.publicUrl
    });

    return NextResponse.json({ asset });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "素材保存失败。" },
      { status: 400 }
    );
  }
}
