"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Asset } from "@/modules/domain/types";

interface EventArchiveCardProps {
  cosplayTitle: string;
  recognized: boolean;
  sceneAsset: Asset;
  sharedPhotoAsset?: Asset | null;
  talentName: string;
  talentSlug: string;
}

export function EventArchiveCard({
  cosplayTitle,
  recognized,
  sceneAsset,
  sharedPhotoAsset,
  talentName,
  talentSlug
}: EventArchiveCardProps) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const showSharedPhoto = Boolean(sharedPhotoAsset) && (hovered || pinned);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/10">
      <div
        className="relative aspect-[4/3]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Image
          src={sceneAsset.url}
          alt={sceneAsset.alt}
          fill
          sizes="(min-width: 768px) 42vw, 100vw"
          className="object-cover"
        />
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
        <Link href={`/talents/${talentSlug}`} className="text-xl text-white">
          {talentName}
        </Link>
        <p className="text-sm text-white/60">{cosplayTitle}</p>
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.15em] text-white/55">
          <span>{recognized ? "已认出" : "未认出"}</span>
          {sharedPhotoAsset ? (
            <button
              type="button"
              onClick={() => setPinned((current) => !current)}
              className="rounded-full border border-white/12 px-2 py-1 text-[11px] tracking-[0.15em] text-white/70 transition hover:border-white/25 hover:text-white"
            >
              有合照
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
