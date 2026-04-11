import "server-only";

import { eq } from "drizzle-orm";
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
  ContentState,
  Event,
  Talent
} from "@/modules/domain/types";
import type { ContentRepository } from "@/modules/repository/types";

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

  return {
    editors: editorRows.map((row) => ({
      id: row.id,
      slug: row.slug as ContentState["editors"][number]["slug"],
      name: row.name,
      title: row.title,
      bio: row.bio,
      accent: row.accent,
      intro: row.intro,
      email: row.email,
      passwordHash: row.passwordHash
    })),
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
      width: row.width,
      height: row.height
    })),
    talents: talentRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      nickname: row.nickname,
      bio: row.bio,
      mcn: row.mcn,
      coverAssetId: row.coverAssetId,
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
          assetId: item.assetId
        }))
    })),
    events: eventRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      startsAt: row.startsAt.toISOString(),
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
          sceneAssetId: entry.sceneAssetId,
          sharedPhotoAssetId: entry.sharedPhotoAssetId,
          cosplayTitle: entry.cosplayTitle,
          recognized: entry.recognized,
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
      talent.tags.map((tag, index) => ({
        id: `${talent.id}-tag-${index}`,
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
    await db.insert(talentAssets).values(
      talent.representations.map((representation, index) => ({
        id: representation.id,
        talentId: talent.id,
        assetId: representation.assetId,
        role: "representation",
        label: representation.title,
        sortOrder: index
      }))
    );
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
      ? {
          id: row.id,
          slug: row.slug as ContentState["editors"][number]["slug"],
          name: row.name,
          title: row.title,
          bio: row.bio,
          accent: row.accent,
          intro: row.intro,
          email: row.email,
          passwordHash: row.passwordHash
        }
      : null;
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
        coverAssetId: talent.coverAssetId,
        updatedAt: new Date(talent.updatedAt)
      })
      .onConflictDoUpdate({
        target: talents.id,
        set: {
          slug: talent.slug,
          nickname: talent.nickname,
          bio: talent.bio,
          mcn: talent.mcn,
          coverAssetId: talent.coverAssetId,
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
        startsAt: new Date(event.startsAt),
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
          startsAt: new Date(event.startsAt),
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
      await db.insert(eventLineup).values(nextLineups);
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
          id: `${tier.id}-${talentId}`,
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
          sceneAssetId: entry.sceneAssetId,
          sharedPhotoAssetId: entry.sharedPhotoAssetId ?? null,
          cosplayTitle: entry.cosplayTitle,
          recognized: entry.recognized,
          hasSharedPhoto: entry.hasSharedPhoto
        }))
      );
    }

    return archive;
  }
};
