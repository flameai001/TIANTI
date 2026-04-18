"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ASSET_DISPLAY_PRESETS } from "@/lib/asset-display";
import { getTalentPath } from "@/lib/public-path";
import type { Asset } from "@/modules/domain/types";

interface EventArchiveCardProps {
  canToggleSharedPhoto?: boolean;
  cosplayTitle: string;
  recognized: boolean;
  sceneAsset?: Asset | null;
  sharedPhotoAsset?: Asset | null;
  talentId: string;
  talentName: string;
  talentSlug?: string | null;
}

export function EventArchiveCard({
  canToggleSharedPhoto = false,
  cosplayTitle,
  recognized,
  sceneAsset,
  sharedPhotoAsset,
  talentId,
  talentName,
  talentSlug
}: EventArchiveCardProps) {
  const sceneDisplayPreset = ASSET_DISPLAY_PRESETS.event_scene;
  const [isSharedPhotoVisible, setIsSharedPhotoVisible] = useState(false);
  const showSharedPhoto = Boolean(sharedPhotoAsset) && isSharedPhotoVisible;

  return (
    <div className="surface overflow-hidden rounded-[1.6rem]">
      <div className="relative" style={{ aspectRatio: sceneDisplayPreset.aspectStyle }}>
        {sceneAsset ? (
          <Image
            src={sceneAsset.url}
            alt={sceneAsset.alt}
            fill
            sizes="(min-width: 768px) 42vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-transparent" />
        )}
        {sharedPhotoAsset ? (
          <Image
            src={sharedPhotoAsset.url}
            alt={sharedPhotoAsset.alt}
            fill
            sizes="(min-width: 768px) 42vw, 100vw"
            className={`object-cover transition duration-300 ${showSharedPhoto ? "opacity-100" : "opacity-0"}`}
          />
        ) : null}
      </div>
      <div className="space-y-3 p-5">
        <Link href={getTalentPath({ id: talentId, slug: talentSlug })} className="text-xl tracking-[-0.03em] text-[var(--foreground)]">
          {talentName}
        </Link>
        <p className="text-sm ui-subtle">{cosplayTitle}</p>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.15em] ui-muted">
          <span>{recognized ? "已认出" : "未认出"}</span>
          {sharedPhotoAsset ? (
            canToggleSharedPhoto ? (
              <button
                type="button"
                data-testid="archive-shared-toggle"
                onClick={() => setIsSharedPhotoVisible((current) => !current)}
                className="rounded-full border border-[var(--line-soft)] px-3 py-1 text-[11px] tracking-[0.15em] transition hover:border-[rgba(43,109,246,0.22)] hover:text-[var(--foreground)]"
              >
                已集邮
              </button>
            ) : (
              <span>已集邮</span>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
