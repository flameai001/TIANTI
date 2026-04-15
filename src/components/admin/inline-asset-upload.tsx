"use client";

import { useState } from "react";
import type { Asset, AssetKind } from "@/modules/domain/types";

interface InlineAssetUploadProps {
  kind: AssetKind;
  onUploaded: (asset: Asset) => void;
  buttonLabel?: string;
  dataTestId?: string;
}

function getImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      reject(new Error("无法读取图片尺寸，请更换图片重试。"));
      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  });
}

export function InlineAssetUpload({
  kind,
  onUploaded,
  buttonLabel = "上传本地图片",
  dataTestId
}: InlineAssetUploadProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleChange(file: File | null) {
    if (!file) return;

    setPending(true);
    setMessage(null);

    try {
      const dimensions = await getImageDimensions(file);
      const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "未命名图片";
      const formData = new FormData();
      formData.set("file", file);
      formData.set("kind", kind);
      formData.set("title", baseName);
      formData.set("alt", baseName);
      formData.set("width", String(dimensions.width));
      formData.set("height", String(dimensions.height));

      const response = await fetch("/api/admin/assets", {
        method: "POST",
        body: formData
      });
      const data = (await response.json().catch(() => null)) as { error?: string; asset?: Asset } | null;

      if (!response.ok || !data?.asset) {
        throw new Error(data?.error ?? "上传失败。");
      }

      onUploaded(data.asset);
      setMessage(`已上传 ${data.asset.title}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="inline-flex cursor-pointer items-center rounded-full border border-white/12 px-3 py-2 text-xs text-white/72 transition hover:border-white/25 hover:text-white">
        <input
          data-testid={dataTestId}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={pending}
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = event.target.files?.[0] ?? null;
            await handleChange(file);
            input.value = "";
          }}
        />
        {pending ? "上传中..." : buttonLabel}
      </label>
      {message ? <p className="text-xs text-white/52">{message}</p> : null}
    </div>
  );
}
