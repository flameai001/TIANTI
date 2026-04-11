import { hash } from "@node-rs/argon2";
import { appEnv } from "@/lib/env";
import { demoSeedState } from "@/modules/domain/seed";
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

async function buildSeedState() {
  const [firstPasswordHash, secondPasswordHash] = await Promise.all(
    appEnv.editorCredentials.map((credential) => hash(credential.password))
  );

  return {
    ...demoSeedState,
    editors: demoSeedState.editors.map((editor, index) => ({
      ...editor,
      email: appEnv.editorCredentials[index]?.email ?? editor.email,
      passwordHash: index === 0 ? firstPasswordHash : secondPasswordHash
    }))
  };
}

async function main() {
  const db = getDb();
  const state = await buildSeedState();

  await db.delete(sessions);
  await db.delete(archiveEntries);
  await db.delete(editorArchives);
  await db.delete(ladderEntries);
  await db.delete(ladderTiers);
  await db.delete(ladders);
  await db.delete(eventLineup);
  await db.delete(events);
  await db.delete(talentAssets);
  await db.delete(talentLinks);
  await db.delete(talentTags);
  await db.delete(talents);
  await db.delete(assets);
  await db.delete(editors);

  await db.insert(editors).values(state.editors);
  await db.insert(assets).values(state.assets);
  await db.insert(talents).values(
    state.talents.map((talent) => ({
      id: talent.id,
      slug: talent.slug,
      nickname: talent.nickname,
      bio: talent.bio,
      mcn: talent.mcn,
      coverAssetId: talent.coverAssetId,
      updatedAt: new Date(talent.updatedAt)
    }))
  );
  await db.insert(talentTags).values(
    state.talents.flatMap((talent) =>
      talent.tags.map((tag, index) => ({
        id: `${talent.id}-tag-${index}`,
        talentId: talent.id,
        tag
      }))
    )
  );
  await db.insert(talentLinks).values(
    state.talents.flatMap((talent) =>
      talent.links.map((link, index) => ({
        id: link.id,
        talentId: talent.id,
        label: link.label,
        url: link.url,
        sortOrder: index
      }))
    )
  );
  await db.insert(talentAssets).values(
    state.talents.flatMap((talent) =>
      talent.representations.map((representation, index) => ({
        id: representation.id,
        talentId: talent.id,
        assetId: representation.assetId,
        role: "representation",
        label: representation.title,
        sortOrder: index
      }))
    )
  );
  await db.insert(events).values(
    state.events.map((event) => ({
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
    }))
  );
  await db.insert(eventLineup).values(state.lineups);
  await db.insert(ladders).values(
    state.ladders.map((ladder) => ({
      id: ladder.id,
      editorId: ladder.editorId,
      title: ladder.title,
      subtitle: ladder.subtitle
    }))
  );
  await db.insert(ladderTiers).values(
    state.ladders.flatMap((ladder) =>
      ladder.tiers.map((tier) => ({
        id: tier.id,
        ladderId: ladder.id,
        name: tier.name,
        sortOrder: tier.order
      }))
    )
  );
  await db.insert(ladderEntries).values(
    state.ladders.flatMap((ladder) =>
      ladder.tiers.flatMap((tier) =>
        tier.talentIds.map((talentId, index) => ({
          id: `${tier.id}-${talentId}`,
          tierId: tier.id,
          talentId,
          sortOrder: index
        }))
      )
    )
  );
  await db.insert(editorArchives).values(
    state.archives.map((archive) => ({
      id: archive.id,
      editorId: archive.editorId,
      eventId: archive.eventId,
      note: archive.note,
      updatedAt: new Date(archive.updatedAt)
    }))
  );
  await db.insert(archiveEntries).values(
    state.archives.flatMap((archive) =>
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
    )
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        editors: state.editors.length,
        talents: state.talents.length,
        events: state.events.length,
        ladders: state.ladders.length,
        archives: state.archives.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
