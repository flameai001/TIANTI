import "server-only";

import type {
  ArchiveEntry,
  ContentState,
  DashboardSummary,
  EditorLadder,
  Event,
  EventSummary,
  LadderTier,
  SiteSearchResult,
  Talent,
  TalentDetail,
  TalentSummary
} from "@/modules/domain/types";

function byId<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function sortByDateDesc<T extends { updatedAt: string }>(rows: T[]) {
  return [...rows].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function sortEvents(events: Event[]) {
  return [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export interface TalentFilters {
  query?: string;
  tag?: string;
  onlyFuture?: boolean;
  editorId?: string;
  tierId?: string;
}

export interface EventFilters {
  query?: string;
  eventStatus?: "future" | "past";
  city?: string;
  talentId?: string;
  participationStatus?: "confirmed" | "pending";
  startDate?: string;
  endDate?: string;
}

function parseDateBoundary(value?: string, endOfDay = false) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (value.length <= 10) {
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
  }

  return date.getTime();
}

export function getEditors(state: ContentState) {
  return state.editors;
}

export function getHomepageCollections(state: ContentState) {
  return {
    featuredTalents: listTalents(state).slice(0, 3),
    futureEvents: listEventSummaries(state, { eventStatus: "future" }).slice(0, 2),
    recentArchives: sortByDateDesc(state.archives).slice(0, 2),
    ladderSpotlights: state.ladders.map((ladder) => ({
      ladder,
      topTier: [...ladder.tiers].sort((a, b) => a.order - b.order).find((tier) => tier.talentIds.length > 0) ?? ladder.tiers[0]
    }))
  };
}

export function listTalents(state: ContentState, filters: TalentFilters = {}): TalentSummary[] {
  const assetMap = byId(state.assets);
  const futureTalentIds = new Set(
    state.lineups
      .filter((lineup) => state.events.some((event) => event.id === lineup.eventId && event.status === "future"))
      .map((lineup) => lineup.talentId)
  );

  let talents = state.talents.filter((talent) => {
    const matchesQuery =
      !filters.query ||
      `${talent.nickname} ${talent.bio} ${talent.tags.join(" ")}`
        .toLowerCase()
        .includes(filters.query.toLowerCase());
    const matchesTag = !filters.tag || talent.tags.includes(filters.tag as Talent["tags"][number]);
    const matchesFuture = !filters.onlyFuture || futureTalentIds.has(talent.id);

    let matchesLadder = true;
    if (filters.editorId) {
      const ladder = state.ladders.find((item) => item.editorId === filters.editorId);
      const tiers = ladder?.tiers ?? [];
      matchesLadder = tiers.some((tier) => tier.talentIds.includes(talent.id));

      if (filters.tierId) {
        matchesLadder = tiers.some((tier) => tier.id === filters.tierId && tier.talentIds.includes(talent.id));
      }
    }

    return matchesQuery && matchesTag && matchesFuture && matchesLadder;
  });

  talents = sortByDateDesc(talents);

  return talents.map((talent) => {
    const latestEvent = sortEvents(
      state.events.filter((event) =>
        state.lineups.some((lineup) => lineup.eventId === event.id && lineup.talentId === talent.id)
      )
    ).at(-1);

    return {
      id: talent.id,
      slug: talent.slug,
      nickname: talent.nickname,
      bio: talent.bio,
      tags: talent.tags,
      cover: assetMap.get(talent.coverAssetId)!,
      recentHint: latestEvent ? `${latestEvent.city} · ${latestEvent.name}` : null,
      hasFutureEvent: futureTalentIds.has(talent.id)
    };
  });
}

export function getTalentDetail(state: ContentState, slug: string): TalentDetail | null {
  const assetMap = byId(state.assets);
  const talent = state.talents.find((item) => item.slug === slug);
  if (!talent) return null;

  const relatedEventIds = state.lineups
    .filter((lineup) => lineup.talentId === talent.id)
    .map((lineup) => lineup.eventId);

  const relatedEvents = state.events.filter((event) => relatedEventIds.includes(event.id));
  const futureEvents = sortEvents(relatedEvents.filter((event) => event.status === "future"));
  const pastEvents = sortEvents(relatedEvents.filter((event) => event.status === "past")).reverse();

  const editorSummaries = state.editors.map((editor) => {
    const ladder = state.ladders.find((item) => item.editorId === editor.id);
    const tierName = ladder?.tiers.find((tier) => tier.talentIds.includes(talent.id))?.name ?? null;
    const archiveEntries = state.archives
      .filter((archive) => archive.editorId === editor.id)
      .flatMap((archive) => archive.entries.filter((entry) => entry.talentId === talent.id));

    return {
      editor,
      tierName,
      seenCount: archiveEntries.length,
      sharedPhotoCount: archiveEntries.filter((entry) => entry.hasSharedPhoto).length
    };
  });

  return {
    talent,
    cover: assetMap.get(talent.coverAssetId)!,
    representationAssets: talent.representations.map((representation) => ({
      ...representation,
      asset: assetMap.get(representation.assetId)!
    })),
    futureEvents,
    pastEvents,
    editorSummaries
  };
}

function hydrateEventSummaryRows(state: ContentState, events: Event[]): EventSummary[] {
  const assetMap = byId(state.assets);
  const talentMap = byId(state.talents);

  return events.map((event) => ({
    event,
    lineups: state.lineups
      .filter((lineup) => lineup.eventId === event.id)
      .map((lineup) => {
        const talent = talentMap.get(lineup.talentId)!;
        return {
          lineup,
          talent,
          cover: assetMap.get(talent.coverAssetId)!
        };
      })
  }));
}

export function listEventSummaries(
  state: ContentState,
  filters: EventFilters = {}
): EventSummary[] {
  const query = filters.query?.trim().toLowerCase();
  const startBoundary = parseDateBoundary(filters.startDate);
  const endBoundary = parseDateBoundary(filters.endDate, true);
  const talentMap = byId(state.talents);

  let events = state.events.filter((event) => {
    const eventLineups = state.lineups.filter((lineup) => lineup.eventId === event.id);
    const lineupText = eventLineups
      .map((lineup) => {
        const talent = talentMap.get(lineup.talentId);
        return talent ? `${talent.nickname} ${talent.tags.join(" ")}` : "";
      })
      .join(" ");
    const matchesQuery =
      !query ||
      `${event.name} ${event.city} ${event.venue} ${event.note} ${lineupText}`
        .toLowerCase()
        .includes(query);
    const matchesStatus = !filters.eventStatus || event.status === filters.eventStatus;
    const matchesCity = !filters.city || event.city === filters.city;
    const startsAt = Date.parse(event.startsAt);
    const matchesStartDate = startBoundary === null || startsAt >= startBoundary;
    const matchesEndDate = endBoundary === null || startsAt <= endBoundary;

    let matchesTalent = true;
    let matchesParticipation = true;
    if (filters.talentId || filters.participationStatus) {
      matchesTalent =
        !filters.talentId || eventLineups.some((lineup) => lineup.talentId === filters.talentId);
      matchesParticipation =
        !filters.participationStatus ||
        eventLineups.some((lineup) => lineup.status === filters.participationStatus);
    }

    return (
      matchesQuery &&
      matchesStatus &&
      matchesCity &&
      matchesTalent &&
      matchesParticipation &&
      matchesStartDate &&
      matchesEndDate
    );
  });

  events = sortEvents(events);
  if (filters.eventStatus === "past") {
    events = events.reverse();
  }

  return hydrateEventSummaryRows(state, events);
}

export function getEventDetail(state: ContentState, slug: string) {
  const event = state.events.find((item) => item.slug === slug);
  if (!event) return null;

  const assetMap = byId(state.assets);
  const talentMap = byId(state.talents);
  const editorMap = byId(state.editors);

  return {
    event,
    lineups: hydrateEventSummaryRows(state, [event])[0]?.lineups ?? [],
    archives: state.archives
      .filter((archive) => archive.eventId === event.id)
      .map((archive) => ({
        editor: editorMap.get(archive.editorId)!,
        archive,
        entries: archive.entries.map((entry) => ({
          entry,
          talent: talentMap.get(entry.talentId)!,
          sceneAsset: assetMap.get(entry.sceneAssetId)!,
          sharedPhotoAsset: entry.sharedPhotoAssetId ? assetMap.get(entry.sharedPhotoAssetId) ?? null : null
        }))
      }))
  };
}

export function getLadders(state: ContentState) {
  return state.ladders.map((ladder) => ({
    ladder,
    editor: state.editors.find((editor) => editor.id === ladder.editorId)!,
    tiers: [...ladder.tiers].sort((a, b) => a.order - b.order)
  }));
}

export function getLadderByEditor(state: ContentState, editorSlug: string) {
  const editor = state.editors.find((item) => item.slug === editorSlug);
  if (!editor) return null;

  const assetMap = byId(state.assets);
  const talentMap = byId(state.talents);
  const ladder = state.ladders.find((item) => item.editorId === editor.id);
  if (!ladder) return null;

  return {
    editor,
    ladder,
    tiers: [...ladder.tiers]
      .sort((a, b) => a.order - b.order)
      .map((tier) => ({
        ...tier,
        talents: tier.talentIds
          .map((talentId) => talentMap.get(talentId))
          .filter(Boolean)
          .map((talent) => ({
            talent: talent!,
            cover: assetMap.get(talent!.coverAssetId)!
          }))
      }))
  };
}

export function searchSite(state: ContentState, query: string): SiteSearchResult {
  return {
    talents: listTalents(state, { query }),
    events: listEventSummaries(state, { query })
  };
}

export function getDashboardSummary(state: ContentState, editorId: string): DashboardSummary {
  return {
    recentTalents: sortByDateDesc(state.talents).slice(0, 4),
    recentEvents: sortByDateDesc(state.events).slice(0, 4),
    upcomingEvents: sortEvents(state.events.filter((event) => event.status === "future")).slice(0, 4),
    myRecentArchives: sortByDateDesc(state.archives.filter((archive) => archive.editorId === editorId)).slice(0, 4)
  };
}

export function getEditorArchiveForEvent(state: ContentState, editorId: string, eventId: string) {
  return (
    state.archives.find((archive) => archive.editorId === editorId && archive.eventId === eventId) ?? null
  );
}

export function getTierNameForTalent(ladder: EditorLadder, talentId: string) {
  return ladder.tiers.find((tier) => tier.talentIds.includes(talentId))?.name ?? null;
}

export function getArchiveEntryStats(entries: ArchiveEntry[]) {
  return {
    seenCount: entries.length,
    sharedPhotoCount: entries.filter((entry) => entry.hasSharedPhoto).length
  };
}

export function reorderTiers(tiers: LadderTier[]) {
  return [...tiers].sort((a, b) => a.order - b.order);
}
