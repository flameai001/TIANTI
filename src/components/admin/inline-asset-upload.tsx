"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ASSET_DISPLAY_PRESETS } from "@/lib/asset-display";
import type { Asset, AssetKind } from "@/modules/domain/types";

interface InlineAssetUploadProps {
  kind: AssetKind;
  onUploaded: (asset: Asset) => void;
  currentAsset?: Asset | null;
  onClear?: () => void;
  buttonLabel?: string;
  clearButtonLabel?: string;
  emptyLabel?: string;
  helperText?: string;
  dataTestId?: string;
}

interface CropSession {
  baseName: string;
  imageUrl: string;
  originalFile: File;
  width: number;
  height: number;
}

interface CropBoxSize {
  width: number;
  height: number;
}

interface CropOffset {
  x: number;
  y: number;
}

function getUploadErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "Failed to fetch") {
      return "上传请求失败，请检查网络连接或 R2 存储配置。";
    }

    return error.message;
  }

  return "上传失败。";
}

function clampOffset(
  offset: CropOffset,
  imageWidth: number,
  imageHeight: number,
  cropBox: CropBoxSize,
  scale: number
) {
  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  const maxX = Math.max(0, (scaledWidth - cropBox.width) / 2);
  const maxY = Math.max(0, (scaledHeight - cropBox.height) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y))
  };
}

function replaceFileExtension(fileName: string, extension: string) {
  const normalizedExtension = extension.startsWith(".") ? extension : `.${extension}`;
  return fileName.replace(/\.[^.]+$/, "") + normalizedExtension;
}

function getOutputType(originalType: string) {
  if (originalType === "image/jpeg" || originalType === "image/png" || originalType === "image/webp") {
    return originalType;
  }

  return "image/png";
}

function getOutputExtension(outputType: string) {
  if (outputType === "image/jpeg") return ".jpg";
  if (outputType === "image/webp") return ".webp";
  return ".png";
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("无法读取图片，请更换图片重试。"));
    image.src = src;
  });
}

async function createCropSession(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(imageUrl);
    const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "未命名图片";

    return {
      baseName,
      imageUrl,
      originalFile: file,
      width: image.naturalWidth,
      height: image.naturalHeight
    } satisfies CropSession;
  } catch (error) {
    URL.revokeObjectURL(imageUrl);
    throw error;
  }
}

async function createCroppedUploadFile(
  cropSession: CropSession,
  cropBox: CropBoxSize,
  scale: number,
  offset: CropOffset
) {
  const image = await loadImageElement(cropSession.imageUrl);
  const displayedWidth = cropSession.width * scale;
  const displayedHeight = cropSession.height * scale;
  const imageLeft = (cropBox.width - displayedWidth) / 2 + offset.x;
  const imageTop = (cropBox.height - displayedHeight) / 2 + offset.y;
  const sourceX = Math.max(0, -imageLeft / scale);
  const sourceY = Math.max(0, -imageTop / scale);
  const sourceWidth = Math.min(cropSession.width, cropBox.width / scale);
  const sourceHeight = Math.min(cropSession.height, cropBox.height / scale);
  const outputWidth = Math.max(1, Math.round(sourceWidth));
  const outputHeight = Math.max(1, Math.round(sourceHeight));
  const outputType = getOutputType(cropSession.originalFile.type);
  const outputFileName = replaceFileExtension(
    cropSession.originalFile.name,
    getOutputExtension(outputType)
  );
  const canvas = document.createElement("canvas");

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器当前无法处理图片裁剪，请更换浏览器重试。");
  }

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (!value) {
          reject(new Error("图片裁剪失败，请重新选择图片。"));
          return;
        }

        resolve(value);
      },
      outputType,
      outputType === "image/jpeg" ? 0.92 : undefined
    );
  });

  return {
    file: new File([blob], outputFileName, { type: outputType }),
    width: outputWidth,
    height: outputHeight
  };
}

export function InlineAssetUpload({
  kind,
  onUploaded,
  currentAsset = null,
  onClear,
  buttonLabel = "上传本地图片",
  clearButtonLabel = "清空当前图片",
  emptyLabel = "当前未上传图片",
  helperText,
  dataTestId
}: InlineAssetUploadProps) {
  const preset = useMemo(() => ASSET_DISPLAY_PRESETS[kind], [kind]);
  const cropFrameRef = useRef<HTMLDivElement | null>(null);
  const dragDepthRef = useRef(0);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originOffset: CropOffset;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const [cropBox, setCropBox] = useState<CropBoxSize | null>(null);
  const [offset, setOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const minScale = useMemo(() => {
    if (!cropSession || !cropBox) {
      return 1;
    }

    return Math.max(cropBox.width / cropSession.width, cropBox.height / cropSession.height);
  }, [cropBox, cropSession]);
  const safeScale = Math.max(scale, minScale);
  const maxScale = Math.max(minScale * 4, minScale + 1.5);

  useEffect(() => {
    if (!cropSession) {
      return;
    }

    return () => {
      URL.revokeObjectURL(cropSession.imageUrl);
    };
  }, [cropSession]);

  useEffect(() => {
    if (!cropSession) {
      setCropBox(null);
      return;
    }

    const node = cropFrameRef.current;
    if (!node) {
      return;
    }

    const updateCropBox = () => {
      setCropBox({
        width: node.clientWidth,
        height: node.clientHeight
      });
    };

    updateCropBox();

    const resizeObserver = new ResizeObserver(updateCropBox);
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, [cropSession]);

  useEffect(() => {
    if (!cropSession || !cropBox) {
      return;
    }

    setOffset({ x: 0, y: 0 });
    setScale(minScale);
  }, [cropBox, cropSession, minScale]);

  useEffect(() => {
    if (!cropSession || !cropBox) {
      return;
    }

    setOffset((current) => clampOffset(current, cropSession.width, cropSession.height, cropBox, safeScale));
  }, [cropBox, cropSession, safeScale]);

  async function uploadPreparedFile(file: File, width: number, height: number, baseName: string) {
    const formData = new FormData();

    formData.set("file", file);
    formData.set("kind", kind);
    formData.set("title", baseName);
    formData.set("alt", baseName);
    formData.set("width", String(width));
    formData.set("height", String(height));

    const response = await fetch("/api/admin/assets", {
      method: "POST",
      body: formData
    });
    const data = (await response.json().catch(() => null)) as { error?: string; asset?: Asset } | null;

    if (response.status === 401) {
      throw new Error("登录已失效，请重新登录后再上传。");
    }

    if (!response.ok || !data?.asset) {
      throw new Error(data?.error ?? "上传失败。");
    }

    onUploaded(data.asset);
    setMessage(`已上传 ${data.asset.title}`);
  }

  async function handleChange(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("请选择可识别的图片文件。");
      return;
    }

    setMessage(null);

    try {
      const nextCropSession = await createCropSession(file);
      setCropSession(nextCropSession);
    } catch (error) {
      setMessage(getUploadErrorMessage(error));
    }
  }

  function hasDraggedImageFile(dataTransfer: DataTransfer | null) {
    if (!dataTransfer) {
      return false;
    }

    if (dataTransfer.items.length > 0) {
      return Array.from(dataTransfer.items).some(
        (item) => item.kind === "file" && (!item.type || item.type.startsWith("image/"))
      );
    }

    if (dataTransfer.files.length > 0) {
      return Array.from(dataTransfer.files).some((file) => file.type.startsWith("image/"));
    }

    return false;
  }

  function getDroppedImageFile(dataTransfer: DataTransfer | null) {
    if (!dataTransfer?.files?.length) {
      return null;
    }

    const imageFile = Array.from(dataTransfer.files).find((file) => file.type.startsWith("image/"));
    return imageFile ?? null;
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    if (pending) {
      return;
    }

    const hasImageFile = hasDraggedImageFile(event.dataTransfer);
    if (!hasImageFile) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDropActive(true);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (pending || !hasDraggedImageFile(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!isDropActive) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDropActive(false);
    }
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    const file = getDroppedImageFile(event.dataTransfer);
    if (!file || pending) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDropActive(false);
    await handleChange(file);
  }

  function closeCropSession() {
    setCropSession(null);
    setCropBox(null);
    setOffset({ x: 0, y: 0 });
    setScale(1);
  }

  async function handleConfirmCrop() {
    if (!cropSession || !cropBox) {
      return;
    }

    setPending(true);
    setMessage(null);

    try {
      const cropped = await createCroppedUploadFile(cropSession, cropBox, safeScale, offset);
      await uploadPreparedFile(cropped.file, cropped.width, cropped.height, cropSession.baseName);
      closeCropSession();
    } catch (error) {
      setMessage(getUploadErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  function handleCropPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropSession || !cropBox || pending) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originOffset: offset
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCropPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!cropSession || !cropBox) {
      return;
    }

    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextOffset = clampOffset(
      {
        x: dragState.originOffset.x + (event.clientX - dragState.startX),
        y: dragState.originOffset.y + (event.clientY - dragState.startY)
      },
      cropSession.width,
      cropSession.height,
      cropBox,
      safeScale
    );

    setOffset(nextOffset);
  }

  function handleCropPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <>
      <div
        className={`flex flex-wrap items-center gap-3 rounded-[1.3rem] transition ${
          isDropActive ? "border border-dashed border-[var(--color-accent)] bg-[rgba(43,109,246,0.08)] p-3" : ""
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="w-full max-w-xs overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/20">
          <div className="relative" style={{ aspectRatio: preset.aspectStyle }}>
            {currentAsset ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentAsset.url}
                alt={currentAsset.alt}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),rgba(255,255,255,0.03)_45%,rgba(0,0,0,0.45))]" />
            )}
          </div>
          <div className="border-t border-white/10 px-3 py-2 text-xs text-white/52">
            {currentAsset ? currentAsset.title : emptyLabel}
          </div>
        </div>
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
        {onClear ? (
          <button
            type="button"
            data-testid={dataTestId ? `${dataTestId}-clear` : undefined}
            onClick={onClear}
            disabled={pending || !currentAsset}
            className="rounded-full border border-[#b13b45]/45 px-3 py-2 text-xs text-[#5f0f18] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {clearButtonLabel}
          </button>
        ) : null}
        <p className="text-[11px] text-white/42">
          {helperText ?? `上传前会按前台比例 ${preset.ratioLabel} 裁剪`}
        </p>
        {message ? <p className="text-xs text-[#734d07]">{message}</p> : null}
      </div>

      {cropSession ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(244,248,255,0.82)] px-4 py-6 backdrop-blur-sm">
          <div className="surface w-full max-w-3xl rounded-[2rem] p-5 shadow-[0_24px_80px_rgba(24,33,47,0.18)] md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-accent)]">Crop Before Upload</p>
                <h3 className="text-2xl text-[var(--foreground)]">
                  按 {preset.cropTitle} 比例 {preset.ratioLabel} 裁剪
                </h3>
                <p className="max-w-2xl text-sm leading-7 ui-subtle">
                  {preset.cropHint} 拖动画面调整取景，滑动缩放后再上传。
                </p>
              </div>
              <button
                type="button"
                onClick={closeCropSession}
                disabled={pending}
                className="ui-button-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                取消
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="surface-strong rounded-[1.6rem] p-4">
                <div
                  ref={cropFrameRef}
                  data-testid={dataTestId ? `${dataTestId}-crop-frame` : undefined}
                  className="relative mx-auto w-full max-w-[25rem] overflow-hidden rounded-[1.35rem] border border-[var(--line-soft)] bg-white/80 touch-none"
                  style={{ aspectRatio: preset.aspectStyle }}
                  onPointerDown={handleCropPointerDown}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerEnd}
                  onPointerCancel={handleCropPointerEnd}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cropSession.imageUrl}
                    alt={cropSession.baseName}
                    draggable={false}
                    className="pointer-events-none absolute left-1/2 top-1/2 max-h-none max-w-none select-none object-cover"
                    style={{
                      width: cropSession.width * safeScale,
                      height: cropSession.height * safeScale,
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                      willChange: "transform"
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 border border-[var(--line-soft)]" />
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-3">
                    <span className="border-r border-[var(--line-soft)]" />
                    <span className="border-r border-[var(--line-soft)]" />
                    <span />
                  </div>
                  <div className="pointer-events-none absolute inset-0 grid grid-rows-3">
                    <span className="border-b border-[var(--line-soft)]" />
                    <span className="border-b border-[var(--line-soft)]" />
                    <span />
                  </div>
                </div>
              </div>

              <div className="surface-strong space-y-5 rounded-[1.6rem] p-5">
                <div>
                  <p className="text-sm text-white">缩放</p>
                  <div className="mt-3 flex items-center gap-4">
                    <input
                      data-testid={dataTestId ? `${dataTestId}-crop-zoom` : undefined}
                      type="range"
                      min={minScale}
                      max={maxScale}
                      step={0.01}
                      value={safeScale}
                      onChange={(event) => setScale(Number(event.target.value))}
                      className="w-full accent-[var(--color-accent)]"
                    />
                    <span className="w-14 text-right text-sm ui-subtle">
                      {Math.round((safeScale / minScale) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 rounded-[1.2rem] border border-[var(--line-soft)] bg-white/80 p-4 text-sm ui-subtle">
                  <p>原图尺寸：{cropSession.width} × {cropSession.height}</p>
                  <p>裁剪比例：{preset.ratioLabel}</p>
                  <p>输出将自动匹配当前前台显示比例。</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOffset({ x: 0, y: 0 });
                      setScale(minScale);
                    }}
                    disabled={pending}
                    className="ui-button-secondary px-4 py-2 text-sm disabled:opacity-50"
                  >
                    重置取景
                  </button>
                  <button
                    type="button"
                    data-testid={dataTestId ? `${dataTestId}-confirm-crop` : undefined}
                    onClick={handleConfirmCrop}
                    disabled={pending || !cropBox}
                    className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm uppercase tracking-[0.2em] text-black disabled:opacity-50"
                  >
                    {pending ? "上传中..." : "确认裁剪并上传"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
