interface TransferItemLike {
  kind: string;
  type: string;
  getAsFile: () => File | null;
}

interface ImageTransferLike {
  items?: ArrayLike<TransferItemLike>;
  files?: ArrayLike<File>;
}

interface ImageTransferOptions {
  fallbackBaseName?: string;
}

function getImageExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  return ".png";
}

function normalizeImageFile(
  file: File,
  { fallbackBaseName, forcedMimeType }: ImageTransferOptions & { forcedMimeType?: string } = {}
) {
  const now = Date.now();
  const resolvedType = file.type || forcedMimeType || "image/png";
  const trimmedName = file.name.trim();
  const resolvedName =
    trimmedName || (fallbackBaseName ? `${fallbackBaseName}-${now}${getImageExtension(resolvedType)}` : "");

  if (resolvedName === file.name && resolvedType === file.type) {
    return file;
  }

  return new File([file], resolvedName || file.name, {
    type: resolvedType,
    lastModified: file.lastModified || now
  });
}

function getImageFileFromItems(
  items: ArrayLike<TransferItemLike>,
  options?: ImageTransferOptions
) {
  for (const item of Array.from(items)) {
    if (item.kind !== "file" || (item.type && !item.type.startsWith("image/"))) {
      continue;
    }

    const file = item.getAsFile();
    if (!file) {
      continue;
    }

    const declaredImage = item.type.startsWith("image/");
    const actualImage = file.type.startsWith("image/");
    if (!declaredImage && !actualImage) {
      continue;
    }

    return normalizeImageFile(file, {
      fallbackBaseName: options?.fallbackBaseName,
      forcedMimeType: declaredImage ? item.type : undefined
    });
  }

  return null;
}

export function hasImageFileInTransfer(dataTransfer: ImageTransferLike | null) {
  if (!dataTransfer) {
    return false;
  }

  if (dataTransfer.items?.length) {
    return Array.from(dataTransfer.items).some(
      (item) => item.kind === "file" && (!item.type || item.type.startsWith("image/"))
    );
  }

  if (dataTransfer.files?.length) {
    return Array.from(dataTransfer.files).some((file) => file.type.startsWith("image/"));
  }

  return false;
}

export function getImageFileFromTransfer(
  dataTransfer: ImageTransferLike | null,
  options?: ImageTransferOptions
) {
  if (!dataTransfer) {
    return null;
  }

  if (dataTransfer.items?.length) {
    const imageFromItems = getImageFileFromItems(dataTransfer.items, options);
    if (imageFromItems) {
      return imageFromItems;
    }
  }

  if (!dataTransfer.files?.length) {
    return null;
  }

  const imageFile = Array.from(dataTransfer.files).find((file) => file.type.startsWith("image/"));
  if (!imageFile) {
    return null;
  }

  return normalizeImageFile(imageFile, options);
}
