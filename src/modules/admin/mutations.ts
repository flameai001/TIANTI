import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { slugify } from "@/lib/slug";
import type { Talent } from "@/modules/domain/types";
import type {
  BulkActionResult,
  EventBulkPayload,
  TalentBulkPayload,
  TalentBulkResponse
} from "@/modules/admin/types";
import { getContentRepository } from "@/modules/repository";

const talentSchema = z.object({
  id: z.string().optional(),
  nickname: z.string().min(1),
  slug: z.string().optional(),
  bio: z.string().min(1),
  mcn: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  searchKeywords: z.array(z.string()).default([]),
  coverAssetId: z.string().min(1),
  tags: z.array(z.string()).default([]),
  links: z.array(z.object({ id: z.string().optional(), label: z.string(), url: z.string().url() })).default([]),
  representations: z
    .array(z.object({ id: z.string().optional(), title: z.string(), assetId: z.string() }))
    .default([])
});

const eventSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  searchKeywords: z.array(z.string()).default([]),
  startsAt: z.string().min(1),
  endsAt: z.string().optional().nullable(),
  city: z.string().min(1),
  venue: z.string().min(1),
  status: z.enum(["future", "past"]),
  note: z.string().min(1),
  lineups: z
    .array(
      z.object({
        id: z.string().optional(),
        talentId: z.string(),
        status: z.enum(["confirmed", "pending"]),
        source: z.string().min(1),
        note: z.string().min(1)
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
  entries: z.array(
    z.object({
      id: z.string().optional(),
      talentId: z.string(),
      sceneAssetId: z.string(),
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
  width: z.number().int().positive(),
  height: z.number().int().positive()
});

const talentBulkSchema = z.object({
  action: z.enum(["add_tags", "remove_tags", "delete"]),
  ids: z.array(z.string()).min(1),
  tags: z.array(z.string()).optional()
});

const eventBulkSchema = z.object({
  action: z.enum(["set_status", "delete"]),
  ids: z.array(z.string()).min(1),
  status: z.enum(["future", "past"]).optional()
});

function dedupeIds(ids: string[]) {
  return [...new Set(ids)];
}

function formatMissingReason(kind: "达人" | "活动") {
  return `${kind}不存在或已被删除。`;
}

async function ensureUniqueTalentSlug(id: string, slug: string) {
  const repository = getContentRepository();
  const state = await repository.getState();
  const duplicate = state.talents.find((talent) => talent.slug === slug && talent.id !== id);

  if (duplicate) {
    throw new Error("该达人 slug 已存在，请修改昵称或手动 slug。");
  }
}

async function ensureUniqueEventSlug(id: string, slug: string) {
  const repository = getContentRepository();
  const state = await repository.getState();
  const duplicate = state.events.find((event) => event.slug === slug && event.id !== id);

  if (duplicate) {
    throw new Error("该活动 slug 已存在，请修改活动名或手动 slug。");
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
    width: input.width,
    height: input.height
  });
}

export async function saveTalent(payload: unknown) {
  const repository = getContentRepository();
  const input = talentSchema.parse(payload);
  const id = input.id ?? randomUUID();
  const slug = slugify(input.slug || input.nickname);

  await ensureUniqueTalentSlug(id, slug);

  return repository.upsertTalent({
    id,
    slug,
    nickname: input.nickname,
    bio: input.bio,
    mcn: input.mcn,
    aliases: [...new Set(input.aliases.map((item) => item.trim()).filter(Boolean))],
    searchKeywords: [...new Set(input.searchKeywords.map((item) => item.trim()).filter(Boolean))],
    coverAssetId: input.coverAssetId,
    tags: input.tags as Talent["tags"],
    links: input.links.map((link) => ({
      id: link.id ?? randomUUID(),
      label: link.label,
      url: link.url
    })),
    representations: input.representations.map((item) => ({
      id: item.id ?? randomUUID(),
      title: item.title,
      assetId: item.assetId
    })),
    updatedAt: new Date().toISOString()
  });
}

export async function removeTalent(id: string) {
  const repository = getContentRepository();
  const state = await repository.getState();
  const referenced =
    state.lineups.some((item) => item.talentId === id) ||
    state.archives.some((archive) => archive.entries.some((entry) => entry.talentId === id));

  if (referenced) {
    throw new Error("该达人仍被活动阵容或活动档案引用，无法直接删除。");
  }

  await repository.deleteTalent(id);
}

export async function saveEvent(payload: unknown) {
  const repository = getContentRepository();
  const input = eventSchema.parse(payload);
  const id = input.id ?? randomUUID();
  const slug = slugify(input.slug || input.name);

  await ensureUniqueEventSlug(id, slug);

  const event = await repository.upsertEvent({
    id,
    slug,
    name: input.name,
    aliases: [...new Set(input.aliases.map((item) => item.trim()).filter(Boolean))],
    searchKeywords: [...new Set(input.searchKeywords.map((item) => item.trim()).filter(Boolean))],
    startsAt: new Date(input.startsAt).toISOString(),
    endsAt: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    city: input.city,
    venue: input.venue,
    status: input.status,
    note: input.note,
    updatedAt: new Date().toISOString()
  });

  await repository.replaceEventLineup(
    id,
    input.lineups.map((lineup) => ({
      id: lineup.id ?? randomUUID(),
      eventId: id,
      talentId: lineup.talentId,
      status: lineup.status,
      source: lineup.source,
      note: lineup.note
    }))
  );

  return event;
}

export async function removeEvent(id: string) {
  const repository = getContentRepository();
  const state = await repository.getState();
  const referenced = state.archives.some((archive) => archive.eventId === id);

  if (referenced) {
    throw new Error("该活动已有关联档案，无法直接删除。");
  }

  await repository.deleteEvent(id);
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
  return repository.saveArchive({
    id: input.id ?? randomUUID(),
    editorId,
    eventId: input.eventId,
    note: input.note,
    updatedAt: new Date().toISOString(),
    entries: input.entries.map((entry) => ({
      id: entry.id ?? randomUUID(),
      talentId: entry.talentId,
      sceneAssetId: entry.sceneAssetId,
      sharedPhotoAssetId: entry.sharedPhotoAssetId ?? null,
      cosplayTitle: entry.cosplayTitle,
      recognized: entry.recognized,
      hasSharedPhoto: entry.hasSharedPhoto
    }))
  });
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
