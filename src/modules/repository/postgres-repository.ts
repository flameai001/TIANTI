import "server-only";

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  archiveEntries,
  assets,
  editorArchives,
  editors,
  eventLineup,
  events,
  ladderEntries,
  ladders,
  ladderTiers,
  sessions,
  talentAssets,
  talentLinks,
  talentTags,
  talents
} from "@/db/schema";
import type {
  Asset,
  ContentState,
  EditorAccount,
  EditorProfile,
  Event,
  Talent
} from "@/modules/domain/types";
import type { ContentRepository } from "@/modules/repository/types";

function toEditorProfile(row: typeof editors.$inferSelect): EditorProfile {
  return {
    id: row.id,
    slug: row.slug as EditorProfile["slug"],
    name: row.name,
    title: row.title,
    bio: row.bio,
    accent: row.accent,
    intro: row.intro
  };
}

function toEditorAccount(row: typeof editors.$inferSelect): EditorAccount {
  return {
    ...toEditorProfile(row),
    email: row.email,
    passwordHash: row.passwordHash
  };
}

async function loadState(): Promise<ContentState> {
  const db = getDb();

  const [
    editorRows,
    sessionRows,
    assetRows,
    talentRows,
    tagRows,
    linkRows,
    talentAssetRows,
    eventRows,
    lineupRows,
    ladderRows,
    tierRows,
    ladderEntryRows,
    archiveRows,
    archiveEntryRows
  ] = await Promise.all([
    db.select().from(editors),
    db.select().from(sessions),
    db.select().from(assets),
    db.select().from(talents),
    db.select().from(talentTags),
    db.select().from(talentLinks),
    db.select().from(talentAssets),
    db.select().from(events),
    db.select().from(eventLineup),
    db.select().from(ladders),
    db.select().from(ladderTiers),
    db.select().from(ladderEntries),
    db.select().from(editorArchives),
    db.select().from(archiveEntries)
  ]);

  const fallbackLineupDateByEventId = new Map(
    eventRows.map((row) => [row.id, row.startsAt ?? row.endsAt ?? null])
  );
  const uniqueLineupDateByEventAndTalent = new Map<string, Date | null>();

  for (const row of lineupRows) {
    const key = `${row.eventId}:${row.talentId}`;
    const resolvedLineupDate = row.lineupDate ?? fallbackLineupDateByEventId.get(row.eventId) ?? null;
    if (!uniqueLineupDateByEventAndTalent.has(key)) {
      uniqueLineupDateByEventAndTalent.set(key, resolvedLineupDate);
      continue;
    }

    const previous = uniqueLineupDateByEventAndTalent.get(key) ?? null;
    const previousTime = previous?.getTime() ?? null;
    const nextTime = resolvedLineupDate?.getTime() ?? null;
    if (previousTime !== nextTime) {
      uniqueLineupDateByEventAndTalent.set(key, null);
    }
  }

  return {
    editors: editorRows.map((row) => toEditorProfile(row)),
    sessions: sessionRows.map((row) => ({
      id: row.id,
      editorId: row.editorId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString()
    })),
    assets: assetRows.map((row) => ({
      id: row.id,
      kind: row.kind as ContentState["assets"][number]["kind"],
      title: row.title,
      alt: row.alt,
      url: row.url,
      objectKey: row.objectKey ?? null,
      width: row.width,
      height: row.height,
      createdAt: row.createdAt.toISOString()
    })),
      talents: talentRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        nickname: row.nickname,
        bio: row.bio,
        mcn: row.mcn,
        aliases: row.aliases,
        searchKeywords: row.searchKeywords,
        coverAssetId: row.coverAssetId ?? null,
        updatedAt: row.updatedAt.toISOString(),
      tags: tagRows
        .filter((item) => item.talentId === row.id)
        .map((item) => item.tag) as Talent["tags"],
      links: linkRows
        .filter((item) => item.talentId === row.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          id: item.id,
          label: item.label,
          url: item.url
        })),
      representations: talentAssetRows
        .filter((item) => item.talentId === row.id && item.role === "representation")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          id: item.id,
          title: item.label,
          assetId: item.assetId ?? null
        }))
    })),
      events: eventRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        aliases: row.aliases,
        searchKeywords: row.searchKeywords,
        startsAt: row.startsAt?.toISOString() ?? null,
        endsAt: row.endsAt?.toISOString() ?? null,
      city: row.city,
      venue: row.venue,
      status: row.status as Event["status"],
      note: row.note,
      updatedAt: row.updatedAt.toISOString()
    })),
    lineups: lineupRows.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      talentId: row.talentId,
      lineupDate: (row.lineupDate ?? fallbackLineupDateByEventId.get(row.eventId) ?? null)?.toISOString() ?? null,
      status: row.status as ContentState["lineups"][number]["status"],
      source: row.source,
      note: row.note
    })),
    ladders: ladderRows.map((row) => ({
      id: row.id,
      editorId: row.editorId,
      title: row.title,
      subtitle: row.subtitle,
      tiers: tierRows
        .filter((tier) => tier.ladderId === row.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((tier) => ({
          id: tier.id,
          name: tier.name,
          order: tier.sortOrder,
          talentIds: ladderEntryRows
            .filter((entry) => entry.tierId === tier.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((entry) => entry.talentId)
        }))
    })),
    archives: archiveRows.map((row) => ({
      id: row.id,
      editorId: row.editorId,
      eventId: row.eventId,
      note: row.note,
      updatedAt: row.updatedAt.toISOString(),
      entries: archiveEntryRows
        .filter((entry) => entry.archiveId === row.id)
        .map((entry) => ({
          id: entry.id,
          talentId: entry.talentId,
          entryDate:
            entry.entryDate?.toISOString() ??
            uniqueLineupDateByEventAndTalent.get(`${row.eventId}:${entry.talentId}`)?.toISOString() ??
            fallbackLineupDateByEventId.get(row.eventId)?.toISOString() ??
            null,
          sceneAssetId: entry.sceneAssetId ?? null,
          sharedPhotoAssetId: entry.sharedPhotoAssetId,
          cosplayTitle: entry.cosplayTitle,
          hasSharedPhoto: entry.hasSharedPhoto
        }))
    }))
  };
}

async function upsertTalentRelations(talent: Talent) {
  const db = getDb();

  await db.delete(talentTags).where(eq(talentTags.talentId, talent.id));
  await db.delete(talentLinks).where(eq(talentLinks.talentId, talent.id));
  await db.delete(talentAssets).where(eq(talentAssets.talentId, talent.id));

  if (talent.tags.length > 0) {
    await db.insert(talentTags).values(
      talent.tags.map((tag) => ({
        id: randomUUID(),
        talentId: talent.id,
        tag
      }))
    );
  }

  if (talent.links.length > 0) {
    await db.insert(talentLinks).values(
      talent.links.map((link, index) => ({
        id: link.id,
        talentId: talent.id,
        label: link.label,
        url: link.url,
        sortOrder: index
      }))
    );
  }

  if (talent.representations.length > 0) {
    const validRepresentations = talent.representations.filter(
      (representation) => representation.assetId && representation.assetId.trim()
    );

    if (validRepresentations.length > 0) {
      await db.insert(talentAssets).values(
        validRepresentations.map((representation, index) => ({
          id: representation.id,
          talentId: talent.id,
          assetId: representation.assetId?.trim() || null,
          role: "representation",
          label: representation.title,
          sortOrder: index
        }))
      );
    }
  }
}

export const postgresRepository: ContentRepository = {
  async getState() {
    return loadState();
  },
  async findEditorByEmail(email) {
    const db = getDb();
    const rows = await db.select().from(editors).where(eq(editors.email, email)).limit(1);
    const row = rows[0];

    return row
      ? toEditorAccount(row)
      : null;
  },
  async updateEditorName(editorId, name) {
    const db = getDb();

    await db
      .update(editors)
      .set({
        name,
        updatedAt: new Date()
      })
      .where(eq(editors.id, editorId));

    const rows = await db.select().from(editors).where(eq(editors.id, editorId)).limit(1);
    const row = rows[0];
    if (!row) {
      throw new Error("当前编辑者不存在。");
    }

    return toEditorProfile(row);
  },
  async createSession(session) {
    const db = getDb();
    await db.insert(sessions).values({
      id: session.id,
      editorId: session.editorId,
      tokenHash: session.tokenHash,
      expiresAt: new Date(session.expiresAt),
      createdAt: new Date(session.createdAt)
    });
  },
  async getSessionByTokenHash(tokenHash) {
    const db = getDb();
    const rows = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).limit(1);
    const row = rows[0];

    return row
      ? {
          id: row.id,
          editorId: row.editorId,
          tokenHash: row.tokenHash,
          expiresAt: row.expiresAt.toISOString(),
          createdAt: row.createdAt.toISOString()
        }
      : null;
  },
  async deleteSessionByTokenHash(tokenHash) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  },
  async createAsset(asset: Asset) {
    const db = getDb();
    await db.insert(assets).values({
      id: asset.id,
      kind: asset.kind,
      title: asset.title,
      alt: asset.alt,
      url: asset.url,
      objectKey: asset.objectKey ?? null,
      width: asset.width,
      height: asset.height,
      createdAt: asset.createdAt ? new Date(asset.createdAt) : new Date()
    });
    return asset;
  },
  async deleteAssetIfUnreferenced(id) {
    const db = getDb();
    const result = await db.execute(sql`
      delete from ${assets}
      where ${assets.id} = ${id}
        and not exists (
          select 1
          from ${talents}
          where ${talents.coverAssetId} = ${assets.id}
        )
        and not exists (
          select 1
          from ${talentAssets}
          where ${talentAssets.assetId} = ${assets.id}
        )
        and not exists (
          select 1
          from ${archiveEntries}
          where ${archiveEntries.sceneAssetId} = ${assets.id}
             or ${archiveEntries.sharedPhotoAssetId} = ${assets.id}
        )
      returning ${assets.id}
    `);

    return result.length > 0;
  },
  async upsertTalent(talent) {
    const db = getDb();
    await db
      .insert(talents)
      .values({
        id: talent.id,
        slug: talent.slug,
        nickname: talent.nickname,
        bio: talent.bio,
        mcn: talent.mcn,
        aliases: talent.aliases,
        searchKeywords: talent.searchKeywords,
        coverAssetId: talent.coverAssetId ?? null,
        updatedAt: new Date(talent.updatedAt)
      })
      .onConflictDoUpdate({
        target: talents.id,
        set: {
          slug: talent.slug,
          nickname: talent.nickname,
          bio: talent.bio,
          mcn: talent.mcn,
          aliases: talent.aliases,
          searchKeywords: talent.searchKeywords,
          coverAssetId: talent.coverAssetId ?? null,
          updatedAt: new Date(talent.updatedAt)
        }
      });

    await upsertTalentRelations(talent);
    return talent;
  },
  async deleteTalent(id) {
    const db = getDb();
    await db.delete(talents).where(eq(talents.id, id));
  },
  async upsertEvent(event) {
    const db = getDb();
    await db
      .insert(events)
      .values({
        id: event.id,
        slug: event.slug,
        name: event.name,
        aliases: event.aliases,
        searchKeywords: event.searchKeywords,
        startsAt: event.startsAt ? new Date(event.startsAt) : null,
        endsAt: event.endsAt ? new Date(event.endsAt) : null,
        city: event.city,
        venue: event.venue,
        status: event.status,
        note: event.note,
        updatedAt: new Date(event.updatedAt)
      })
      .onConflictDoUpdate({
        target: events.id,
        set: {
          slug: event.slug,
          name: event.name,
          aliases: event.aliases,
          searchKeywords: event.searchKeywords,
          startsAt: event.startsAt ? new Date(event.startsAt) : null,
          endsAt: event.endsAt ? new Date(event.endsAt) : null,
          city: event.city,
          venue: event.venue,
          status: event.status,
          note: event.note,
          updatedAt: new Date(event.updatedAt)
        }
      });
    return event;
  },
  async replaceEventLineup(eventId, nextLineups) {
    const db = getDb();
    await db.delete(eventLineup).where(eq(eventLineup.eventId, eventId));
    if (nextLineups.length > 0) {
      await db.insert(eventLineup).values(
        nextLineups.map((lineup) => ({
          ...lineup,
          lineupDate: lineup.lineupDate ? new Date(lineup.lineupDate) : null
        }))
      );
    }
  },
  async deleteEvent(id) {
    const db = getDb();
    await db.delete(events).where(eq(events.id, id));
  },
  async saveLadder(ladder) {
    const db = getDb();
    await db
      .insert(ladders)
      .values({
        id: ladder.id,
        editorId: ladder.editorId,
        title: ladder.title,
        subtitle: ladder.subtitle
      })
      .onConflictDoUpdate({
        target: ladders.id,
        set: {
          title: ladder.title,
          subtitle: ladder.subtitle
        }
      });

    const existingTiers = await db.select().from(ladderTiers).where(eq(ladderTiers.ladderId, ladder.id));
    for (const tier of existingTiers) {
      await db.delete(ladderEntries).where(eq(ladderEntries.tierId, tier.id));
    }
    await db.delete(ladderTiers).where(eq(ladderTiers.ladderId, ladder.id));

    if (ladder.tiers.length > 0) {
      await db.insert(ladderTiers).values(
        ladder.tiers.map((tier) => ({
          id: tier.id,
          ladderId: ladder.id,
          name: tier.name,
          sortOrder: tier.order
        }))
      );

      const entries = ladder.tiers.flatMap((tier) =>
        tier.talentIds.map((talentId, index) => ({
          id: randomUUID(),
          tierId: tier.id,
          talentId,
          sortOrder: index
        }))
      );

      if (entries.length > 0) {
        await db.insert(ladderEntries).values(entries);
      }
    }

    return ladder;
  },
  async saveArchive(archive) {
    const db = getDb();
    await db
      .insert(editorArchives)
      .values({
        id: archive.id,
        editorId: archive.editorId,
        eventId: archive.eventId,
        note: archive.note,
        updatedAt: new Date(archive.updatedAt)
      })
      .onConflictDoUpdate({
        target: editorArchives.id,
        set: {
          note: archive.note,
          updatedAt: new Date(archive.updatedAt)
        }
      });

    await db.delete(archiveEntries).where(eq(archiveEntries.archiveId, archive.id));
    if (archive.entries.length > 0) {
      await db.insert(archiveEntries).values(
        archive.entries.map((entry) => ({
          id: entry.id,
          archiveId: archive.id,
          talentId: entry.talentId,
          entryDate: entry.entryDate ? new Date(entry.entryDate) : null,
          sceneAssetId: entry.sceneAssetId ?? null,
          sharedPhotoAssetId: entry.sharedPhotoAssetId ?? null,
          cosplayTitle: entry.cosplayTitle,
          hasSharedPhoto: entry.hasSharedPhoto
        }))
      );
    }

    return archive;
  }
};
