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
      const signatureResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/octet-stream"
        })
      });

      const signature = (await signatureResponse.json().catch(() => null)) as {
        error?: string;
        mode?: "mock" | "r2";
        uploadUrl?: string | null;
        publicUrl?: string | null;
      } | null;

      if (!signatureResponse.ok) {
        throw new Error(signature?.error ?? "上传签名生成失败。");
      }

      if (signature?.mode !== "r2" || !signature.uploadUrl || !signature.publicUrl) {
        throw new Error("当前环境还没有启用真实对象存储，暂时无法上传图片。");
      }

      const uploadResponse = await fetch(signature.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error("图片上传到 R2 失败，请重试。");
      }

      const dimensions = await getImageDimensions(file);
      const assetResponse = await fetch("/api/admin/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          kind,
          title: title.trim(),
          alt: alt.trim(),
          url: signature.publicUrl,
          width: dimensions.width,
          height: dimensions.height
        })
      });

      const assetData = (await assetResponse.json().catch(() => null)) as {
        error?: string;
        asset?: Asset;
      } | null;

      if (!assetResponse.ok || !assetData?.asset) {
        throw new Error(assetData?.error ?? "素材记录保存失败。");
      }

      onUploaded(assetData.asset);
      setMessage(`素材“${assetData.asset.title}”已上传，现在可以在下方直接选用了。`);
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
    <section className="rounded-[1.5rem] border border-white/10 bg-black/15 p-4">
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">Asset Upload</p>
          <h3 className="mt-3 text-xl text-white">上传后台素材</h3>
          <p className="mt-2 text-sm leading-7 text-white/60">
            上传成功后，图片会直传到 R2，并立即写入后台素材库。接着就可以在下方的封面或代表图列表里选择。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <select
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
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="素材标题"
            className="rounded-[1rem] border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none"
          />
          <input
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
            onClick={handleUpload}
            disabled={pending}
            className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm uppercase tracking-[0.25em] text-black disabled:opacity-60"
          >
            {pending ? "上传中..." : "上传到 R2"}
          </button>
        </div>
      </div>
    </section>
  );
}
