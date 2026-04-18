import type { AssetKind } from "@/modules/domain/types";

export interface AssetDisplayPreset {
  aspectWidth: number;
  aspectHeight: number;
  aspectRatio: number;
  aspectStyle: string;
  ratioLabel: string;
  cropTitle: string;
  cropHint: string;
}

function createDisplayPreset(
  aspectWidth: number,
  aspectHeight: number,
  cropTitle: string,
  cropHint: string
): AssetDisplayPreset {
  return {
    aspectWidth,
    aspectHeight,
    aspectRatio: aspectWidth / aspectHeight,
    aspectStyle: `${aspectWidth} / ${aspectHeight}`,
    ratioLabel: `${aspectWidth}:${aspectHeight}`,
    cropTitle,
    cropHint
  };
}

export const ASSET_DISPLAY_PRESETS: Record<AssetKind, AssetDisplayPreset> = {
  talent_cover: createDisplayPreset(3, 4, "达人封面", "前台封面按 3:4 显示。"),
  talent_representation: createDisplayPreset(3, 4, "代表图", "后台代表图按 3:4 裁剪和预览。"),
  event_scene: createDisplayPreset(3, 4, "现场图", "现场图按 3:4 裁剪和显示。"),
  shared_photo: createDisplayPreset(4, 3, "合照", "前台合照覆盖图按 4:3 显示。")
};
