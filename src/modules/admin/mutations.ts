import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getR2StorageConfig, isMockStorageMode } from "@/lib/env";
import {
  deriveEventTemporalStatus,
  getDateOnlyKey,
  getDateRangeDays,
  isMultiDayRange,
  toDateOnlyIso
} from "@/lib/date";
import { slugify } from "@/lib/slug";
import type { Talent } from "@/modules/domain/types";
import type {
  BulkActionResult,
  EventBulkPayload,
  TalentBulkPayload,
  TalentBulkResponse
} from "@/modules/admin/types";
import { getContentRepository } from "@/modules/repository";
import { deleteObjectFromR2 } from "@/storage/r2";

const talentSchema = z.object({
  id: z.string().optional(),
  nickname: z.string().min(1),
  slug: z.string().optional(),
  bio: z.string().optional().default(""),
  mcn: z.string().optional().default(""),
  aliases: z.array(z.string()).optional(),
  searchKeywords: z.array(z.string()).optional(),
  coverAssetId: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  links: z.array(z.object({ id: z.string().optional(), label: z.string(), url: z.string().url() })).default([]),
  representations: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().optional().default(""),
        assetId: z.string().optional().default("")
      })
    )
    .default([]),
  cleanupCandidateAssetIds: z.array(z.string()).optional().default([])
});

const eventSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  searchKeywords: z.array(z.string()).optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().optional().nullable(),
  city: z.string().optional().default(""),
  venue: z.string().optional().default(""),
  status: z.enum(["future", "past"]).optional(),
  note: z.string().optional().default(""),
  lineups: z
    .array(
      z.object({
        id: z.string().optional(),
        talentId: z.string().nullable().optional(),
        lineupDate: z.string().nullable().optional(),
        status: z.enum(["confirmed", "pending"]),
        source: z.string().optional().default(""),
        note: z.string().optional().default("")
      })
    )
    .default([])
});

const ladderSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  tiers: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1),
      order: z.number(),
      talentIds: z.array(z.string())
    })
  )
});

const archiveSchema = z.object({
  id: z.string().optional(),
  eventId: z.string(),
  note: z.string().min(1),
  cleanupCandidateAssetIds: z.array(z.string()).optional().default([]),
  entries: z.array(
    z.object({
      id: z.string().optional(),
      talentId: z.string(),
      entryDate: z.string().nullable().optional(),
      sceneAssetId: z.string().nullable().optional(),
      sharedPhotoAssetId: z.string().nullable().optional(),
      cosplayTitle: z.string().min(1),
      recognized: z.boolean(),
      hasSharedPhoto: z.boolean()
    })
  )
});

const assetSchema = z.object({
  kind: z.enum(["talent_cover", "talent_representation", "event_scene", "shared_photo"]),
  title: z.string().min(1),
  alt: z.string().min(1),
  url: z.string().url(),
  objectKey: z.string().nullable().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive()
});

const talentBulkSchema = z.object({
  action: z.enum(["add_tags", "remove_tags", "delete"]),
  ids: z.array(z.string()).min(1),
  tags: z.array(z.string()).optional()
});

const eventBulkSchema = z.object({
  action: z.enum(["delete"]),
  ids: z.array(z.string()).min(1)
});

const editorNameSchema = z.object({
  name: z.string().trim().min(1).max(24)
});

function dedupeIds(ids: string[]) {
  return [...new Set(ids)];
}

function getValidLineupDateKeys(startsAt?: string | null, endsAt?: string | null) {
  const rangeDates = getDateRangeDays(startsAt, endsAt);
  if (rangeDates.length > 0) {
    return rangeDates;
  }

  const fallbackDate = getDateOnlyKey(startsAt) ?? getDateOnlyKey(endsAt);
  return fallbackDate ? [fallbackDate] : [];
}

function getValidArchiveDateKeys(state: Awaited<ReturnType<ReturnType<typeof getContentRepository>["getState"]>>, eventId: string) {
  const event = state.events.find((item) => item.id === eventId) ?? null;
  if (!event) {
    return {
      event: null,
      isMultiDayEvent: false,
      validDateKeys: new Set<string>()
    };
  }

  return {
    event,
    isMultiDayEvent: isMultiDayRange(event.startsAt ?? null, event.endsAt ?? null),
    validDateKeys: new Set(getValidLineupDateKeys(event.startsAt ?? null, event.endsAt ?? null))
  };
}

function collectReferencedAssetIds(state: Awaited<ReturnType<ReturnType<typeof getContentRepository>["getState"]>>) {
  const referencedAssetIds = new Set<string>();

  for (const talent of state.talents) {
    if (talent.coverAssetId) {
      referencedAssetIds.add(talent.coverAssetId);
    }

    for (const representation of talent.representations) {
      if (representation.assetId) {
        referencedAssetIds.add(representation.assetId);
      }
    }
  }

  for (const archive of state.archives) {
    for (const entry of archive.entries) {
      if (entry.sceneAssetId) {
        referencedAssetIds.add(entry.sceneAssetId);
      }
      if (entry.sharedPhotoAssetId) {
        referencedAssetIds.add(entry.sharedPhotoAssetId);
      }
    }
  }

  return referencedAssetIds;
}

function getAssetObjectKeyFromUrl(url: string) {
  if (isMockStorageMode()) {
    return null;
  }

  try {
    const { publicBaseUrl } = getR2StorageConfig();
    const normalizedBaseUrl = `${publicBaseUrl}/`;
    if (!url.startsWith(normalizedBaseUrl)) {
      return null;
    }

    return decodeURIComponent(url.slice(normalizedBaseUrl.length));
  } catch {
    return null;
  }
}

async function cleanupUnusedAssets(candidateIds: string[]) {
  const repository = getContentRepository();
  const uniqueIds = dedupeIds(candidateIds.map((id) => id.trim()).filter(Boolean));
  if (uniqueIds.length === 0) {
    return;
  }

  const state = await repository.getState();
  const referencedAssetIds = collectReferencedAssetIds(state);
  const assetMap = new Map(state.assets.map((asset) => [asset.id, asset]));

  for (const assetId of uniqueIds) {
    if (referencedAssetIds.has(assetId)) {
      continue;
    }

    const asset = assetMap.get(assetId);
    if (!asset) {
      continue;
    }

    const objectKey = asset.objectKey?.trim() || getAssetObjectKeyFromUrl(asset.url);

    if (objectKey) {
      try {
        await deleteObjectFromR2(objectKey);
      } catch {
        // Ignore storage deletion issues so save flows are not blocked.
      }
    }

    try {
      await repository.deleteAsset(assetId);
    } catch {
      // Ignore concurrent cleanup or stale candidate rows.
    }
  }
}

function formatMissingReason(kind: "达人" | "活动") {
  return `${kind}不存在或已被删除。`;
}

async function ensureUniqueTalentSlug(id: string, slug: string) {
  const repository = getContentRepository();
  const state = await repository.getState();
  const duplicate = state.talents.find((talent) => talent.slug === slug && talent.id !== id);

  if (duplicate) {
    throw new Error("该达人 slug 已存在，请修改昵称。");
  }
}

async function ensureUniqueEventSlug(id: string, slug: string) {
  const repository = getContentRepository();
  const state = await repository.getState();
  const duplicate = state.events.find((event) => event.slug === slug && event.id !== id);

  if (duplicate) {
    throw new Error("该活动 slug 已存在，请修改活动名称。");
  }
}

export async function saveAsset(payload: unknown) {
  const repository = getContentRepository();
  const input = assetSchema.parse(payload);

  return repository.createAsset({
    id: randomUUID(),
    kind: input.kind,
    title: input.title,
    alt: input.alt,
    url: input.url,
    objectKey: input.objectKey ?? null,
    width: input.width,
    height: input.height
  });
}

export async function saveEditorName(editorId: string, payload: unknown) {
  const repository = getContentRepository();
  const input = editorNameSchema.parse(payload);

  return repository.updateEditorName(editorId, input.name);
}

export async function saveTalent(payload: unknown) {
  const repository = getContentRepository();
  const input = talentSchema.parse(payload);
  const state = await repository.getState();
  const id = input.id ?? randomUUID();
  const nickname = input.nickname.trim();
  const slug = slugify(input.slug || nickname);
  const aliases = [...new Set((input.aliases ?? []).map((item) => item.trim()).filter(Boolean))];
  const searchKeywords = [...new Set([nickname, ...aliases, ...((input.searchKeywords ?? []).map((item) => item.trim()).filter(Boolean))])];
  const assetTitleMap = new Map<string | null, string>(state.assets.map((asset) => [asset.id, asset.title]));

  await ensureUniqueTalentSlug(id, slug);

  const talent = await repository.upsertTalent({
    id,
    slug,
    nickname,
    bio: input.bio.trim(),
    mcn: input.mcn.trim(),
    aliases,
    searchKeywords,
    coverAssetId: input.coverAssetId?.trim() || null,
    tags: input.tags as Talent["tags"],
    links: input.links.map((link) => ({
      id: link.id ?? randomUUID(),
      label: link.label,
      url: link.url
    })),
    representations: input.representations
      .map((item) => ({
        id: item.id ?? randomUUID(),
        title: item.title?.trim() ?? "",
        assetId: item.assetId.trim() || null
      }))
      .map((item) => ({
        ...item,
        title: item.title || assetTitleMap.get(item.assetId) || "未命名代表图"
    })),
    updatedAt: new Date().toISOString()
  });

  await cleanupUnusedAssets(input.cleanupCandidateAssetIds ?? []);
  return talent;
}

export async function removeTalent(id: string) {
  const repository = getContentRepository();
  const state = await repository.getState();
  const talent = state.talents.find((item) => item.id === id) ?? null;
  const cleanupCandidateAssetIds = [
    talent?.coverAssetId ?? null,
    ...(talent?.representations.map((representation) => representation.assetId ?? null) ?? [])
  ].filter(Boolean) as string[];

  await repository.deleteTalent(id);
  await cleanupUnusedAssets(cleanupCandidateAssetIds);
}

export async function saveEvent(payload: unknown) {
  const repository = getContentRepository();
  const input = eventSchema.parse(payload);
  const state = await repository.getState();
  const id = input.id ?? randomUUID();
  const existingEvent = state.events.find((event) => event.id === id) ?? null;
  const name = input.name.trim();
  const slug = slugify(input.slug || name);
  const startsAt = toDateOnlyIso(input.startsAt?.trim() ?? "") ?? null;
  const endsAt = toDateOnlyIso(input.endsAt?.trim() ?? "") ?? null;
  const isMultiDayEvent = isMultiDayRange(startsAt, endsAt);
  const validLineupDateKeys = new Set(getValidLineupDateKeys(startsAt, endsAt));
  const derivedStatus =
    startsAt || endsAt
      ? deriveEventTemporalStatus(startsAt, endsAt) === "past"
        ? "past"
        : "future"
      : existingEvent?.status ?? input.status ?? "future";

  await ensureUniqueEventSlug(id, slug);

  const aliases =
    input.aliases === undefined
      ? (existingEvent?.aliases ?? [])
      : [...new Set(input.aliases.map((item) => item.trim()).filter(Boolean))];
  const searchKeywords =
    input.searchKeywords === undefined
      ? (existingEvent?.searchKeywords ?? [])
      : [...new Set(input.searchKeywords.map((item) => item.trim()).filter(Boolean))];
  const lineups = input.lineups
    .filter((lineup) => lineup.talentId?.trim())
    .map((lineup) => {
      const lineupDate = toDateOnlyIso(lineup.lineupDate?.trim() ?? "") ?? null;
      const lineupDateKey = getDateOnlyKey(lineupDate);

      if (isMultiDayEvent && !lineupDate) {
        throw new Error("多日活动的每条达人阵容都必须选择所属日期。");
      }

      if (lineupDateKey && validLineupDateKeys.size > 0 && !validLineupDateKeys.has(lineupDateKey)) {
        throw new Error("达人阵容的所属日期必须落在活动开始和结束日期之间。");
      }

      return {
        id: lineup.id ?? randomUUID(),
        eventId: id,
        talentId: lineup.talentId!.trim(),
        lineupDate,
        status: lineup.status,
        source: lineup.source.trim(),
        note: lineup.note.trim()
      };
    });

  const event = await repository.upsertEvent({
    id,
    slug,
    name,
    aliases,
    searchKeywords,
    startsAt,
    endsAt,
    city: input.city.trim(),
    venue: input.venue.trim(),
    status: derivedStatus,
    note: input.note.trim(),
    updatedAt: new Date().toISOString()
  });

  await repository.replaceEventLineup(id, lineups);

  return event;
}

export async function removeEvent(id: string) {
  const repository = getContentRepository();
  const state = await repository.getState();
  const cleanupCandidateAssetIds = state.archives
    .filter((archive) => archive.eventId === id)
    .flatMap((archive) =>
      archive.entries.flatMap((entry) => [entry.sceneAssetId ?? null, entry.sharedPhotoAssetId ?? null])
    )
    .filter(Boolean) as string[];

  await repository.deleteEvent(id);
  await cleanupUnusedAssets(cleanupCandidateAssetIds);
}

export async function saveLadder(editorId: string, payload: unknown) {
  const repository = getContentRepository();
  const input = ladderSchema.parse(payload);
  return repository.saveLadder({
    ...input,
    editorId,
    tiers: input.tiers.map((tier, index) => ({
      ...tier,
      order: index
    }))
  });
}

export async function saveArchive(editorId: string, payload: unknown) {
  const repository = getContentRepository();
  const input = archiveSchema.parse(payload);
  const state = await repository.getState();
  const { event, isMultiDayEvent, validDateKeys } = getValidArchiveDateKeys(state, input.eventId);

  if (!event) {
    throw new Error("活动不存在或已被删除。");
  }

  const archive = await repository.saveArchive({
    id: input.id ?? randomUUID(),
    editorId,
    eventId: input.eventId,
    note: input.note,
    updatedAt: new Date().toISOString(),
    entries: input.entries.map((entry) => {
      const entryDate = toDateOnlyIso(entry.entryDate?.trim() ?? "") ?? null;
      const entryDateKey = getDateOnlyKey(entryDate);

      if (isMultiDayEvent && !entryDate) {
        throw new Error("多日活动的每条现场档案记录都必须选择所属日期。");
      }

      if (entryDateKey && validDateKeys.size > 0 && !validDateKeys.has(entryDateKey)) {
        throw new Error("现场档案记录的所属日期必须落在活动开始和结束日期之间。");
      }

      return {
        id: entry.id ?? randomUUID(),
        talentId: entry.talentId,
        entryDate,
        sceneAssetId: entry.sceneAssetId?.trim() || null,
        sharedPhotoAssetId: entry.sharedPhotoAssetId ?? null,
        cosplayTitle: entry.cosplayTitle.trim(),
        recognized: entry.recognized,
        hasSharedPhoto: entry.hasSharedPhoto
      };
    })
  });

  await cleanupUnusedAssets(input.cleanupCandidateAssetIds ?? []);
  return archive;
}

export async function saveTalentBulk(payload: unknown): Promise<TalentBulkResponse> {
  const repository = getContentRepository();
  const input = talentBulkSchema.parse(payload) as TalentBulkPayload;
  const ids = dedupeIds(input.ids);
  const state = await repository.getState();
  const talentMap = new Map(state.talents.map((talent) => [talent.id, talent]));
  const blocked: BulkActionResult["blocked"] = [];

  if (input.action === "delete") {
    const succeededIds: string[] = [];

    for (const id of ids) {
      const talent = talentMap.get(id);
      if (!talent) {
        blocked.push({ id, reason: formatMissingReason("达人") });
        continue;
      }

      try {
        await removeTalent(id);
        succeededIds.push(id);
      } catch (error) {
        blocked.push({
          id,
          reason: error instanceof Error ? error.message : "删除失败。"
        });
      }
    }

    return {
      succeededIds,
      blocked
    };
  }

  const tags = [...new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
  if (tags.length === 0) {
    throw new Error("请至少填写一个标签。");
  }

  const updatedTalents: Talent[] = [];

  for (const id of ids) {
    const talent = talentMap.get(id);
    if (!talent) {
      blocked.push({ id, reason: formatMissingReason("达人") });
      continue;
    }

    const nextTags =
      input.action === "add_tags"
        ? [...new Set([...talent.tags, ...tags])]
        : talent.tags.filter((tag) => !tags.includes(tag));

    const updatedTalent = await repository.upsertTalent({
      ...talent,
      tags: nextTags as Talent["tags"],
      updatedAt: new Date().toISOString()
    });

    updatedTalents.push(updatedTalent);
  }

  return {
    succeededIds: updatedTalents.map((talent) => talent.id),
    blocked,
    talents: updatedTalents
  };
}

export async function saveEventBulk(payload: unknown): Promise<BulkActionResult> {
  const repository = getContentRepository();
  const input = eventBulkSchema.parse(payload) as EventBulkPayload;
  const ids = dedupeIds(input.ids);
  const state = await repository.getState();
  const eventMap = new Map(state.events.map((event) => [event.id, event]));
  const blocked: BulkActionResult["blocked"] = [];
  const succeededIds: string[] = [];

  if (input.action === "delete") {
    for (const id of ids) {
      const event = eventMap.get(id);
      if (!event) {
        blocked.push({ id, reason: formatMissingReason("活动") });
        continue;
      }

      try {
        await removeEvent(id);
        succeededIds.push(id);
      } catch (error) {
        blocked.push({
          id,
          reason: error instanceof Error ? error.message : "删除失败。"
        });
      }
    }

    return {
      succeededIds,
      blocked
    };
  }

  if (!input.status) {
    throw new Error("批量修改活动状态时必须提供目标状态。");
  }

  for (const id of ids) {
    const event = eventMap.get(id);
    if (!event) {
      blocked.push({ id, reason: formatMissingReason("活动") });
      continue;
    }

    await repository.upsertEvent({
      ...event,
      status: input.status,
      updatedAt: new Date().toISOString()
    });
    succeededIds.push(id);
  }

  return {
    succeededIds,
    blocked
  };
}
