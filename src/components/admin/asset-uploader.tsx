"use client";

import { useState } from "react";
import type { Asset, AssetKind } from "@/modules/domain/types";

interface AssetUploaderProps {
  allowedKinds: AssetKind[];
  onUploaded: (asset: Asset) => void;
}

const kindLabels: Record<AssetKind, string> = {
  talent_cover: "达人封面",
  talent_representation: "代表图",
  event_scene: "活动现场",
  shared_photo: "合照"
};

function getImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      reject(new Error("无法读取图片尺寸，请换一张图片重试。"));
      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  });
}

export function AssetUploader({ allowedKinds, onUploaded }: AssetUploaderProps) {
  const [kind, setKind] = useState<AssetKind>(allowedKinds[0] ?? "talent_cover");
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) {
      setMessage("请先选择图片文件。");
      return;
    }

    if (!title.trim() || !alt.trim()) {
      setMessage("请补全素材标题和替代文字。");
      return;
    }

    setPending(true);
    setMessage(null);

    try {
      const dimensions = await getImageDimensions(file);
      const formData = new FormData();
      formData.set("file", file);
      formData.set("kind", kind);
      formData.set("title", title.trim());
      formData.set("alt", alt.trim());
      formData.set("width", String(dimensions.width));
      formData.set("height", String(dimensions.height));

      const response = await fetch("/api/admin/assets", {
        method: "POST",
        body: formData
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        asset?: Asset;
      } | null;

      if (!response.ok || !data?.asset) {
        throw new Error(data?.error ?? "素材上传失败。");
      }

      onUploaded(data.asset);
      setMessage(`素材“${data.asset.title}”已上传，现在可以在下方直接选用了。`);
      setTitle("");
      setAlt("");
      setFile(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败，请重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <section data-testid="asset-uploader" className="rounded-[1.5rem] border border-white/10 bg-black/15 p-4">
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">Asset Upload</p>
          <h3 className="mt-3 text-xl text-white">上传后台素材</h3>
          <p className="mt-2 text-sm leading-7 text-white/60">
            上传会先进入站点后台，再由服务端写入真实存储；在本地 mock 模式下，也会先生成可预览的临时素材。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <select
            data-testid="asset-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as AssetKind)}
            className="rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
          >
            {allowedKinds.map((value) => (
              <option key={value} value={value}>
                {kindLabels[value]}
              </option>
            ))}
          </select>
          <input
            data-testid="asset-file"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setFile(nextFile);
              if (nextFile && !title) {
                const baseName = nextFile.name.replace(/\.[^.]+$/, "");
                setTitle(baseName);
                setAlt(baseName);
              }
            }}
            className="rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:text-white"
          />
          <input
            data-testid="asset-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="素材标题"
            className="rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
          />
          <input
            data-testid="asset-alt"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            placeholder="替代文字 / 检索描述"
            className="rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
          />
        </div>
        {message ? <p className="text-sm text-amber-200">{message}</p> : null}
        <div className="flex justify-end">
          <button
            type="button"
            data-testid="asset-submit"
            onClick={handleUpload}
            disabled={pending}
            className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black disabled:opacity-60"
          >
            {pending ? "上传中..." : "上传素材"}
          </button>
        </div>
      </div>
    </section>
  );
}
