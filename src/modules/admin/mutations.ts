import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { slugify } from "@/lib/slug";
import { getContentRepository } from "@/modules/repository";

const talentSchema = z.object({
  id: z.string().optional(),
  nickname: z.string().min(1),
  slug: z.string().optional(),
  bio: z.string().min(1),
  mcn: z.string().min(1),
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

export async function saveTalent(payload: unknown) {
  const repository = getContentRepository();
  const state = await repository.getState();
  const input = talentSchema.parse(payload);
  const id = input.id ?? randomUUID();
  const slug = slugify(input.slug || input.nickname);

  const duplicate = state.talents.find((talent) => talent.slug === slug && talent.id !== id);
  if (duplicate) {
    throw new Error("该达人 slug 已存在，请修改昵称或手动 slug。");
  }

  return repository.upsertTalent({
    id,
    slug,
    nickname: input.nickname,
    bio: input.bio,
    mcn: input.mcn,
    coverAssetId: input.coverAssetId,
    tags: input.tags as never,
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
  const state = await repository.getState();
  const input = eventSchema.parse(payload);
  const id = input.id ?? randomUUID();
  const slug = slugify(input.slug || input.name);

  const duplicate = state.events.find((event) => event.slug === slug && event.id !== id);
  if (duplicate) {
    throw new Error("该活动 slug 已存在，请修改活动名或手动 slug。");
  }

  const event = await repository.upsertEvent({
    id,
    slug,
    name: input.name,
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
