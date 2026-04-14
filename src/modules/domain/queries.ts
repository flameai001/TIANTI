import "server-only";

import type {
  ArchiveEntry,
  ContentState,
  DashboardSummary,
  DiscoverySection,
  EditorLadder,
  Event,
  EventSummary,
  HomepageDiscovery,
  LadderTier,
  RelatedEventSummary,
  RelatedTalentSummary,
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

function sortEventsChronologically(events: Event[]) {
  return [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

function splitQuery(value?: string) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function includesEveryTerm(haystacks: string[], terms: string[]) {
  if (terms.length === 0) return true;
  const combined = haystacks.join(" ").toLowerCase();
  return terms.every((term) => combined.includes(term));
}

function scoreTerms(value: string, terms: string[], weight: number) {
  const lower = value.toLowerCase();
  return terms.reduce((score, term) => score + (lower.includes(term) ? weight : 0), 0);
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

export interface TalentFilters {
  query?: string;
  tag?: string;
  onlyFuture?: boolean;
  editorId?: string;
  tierId?: string;
  sort?: "relevance" | "recent" | "future" | "archiveCount";
}

export interface EventFilters {
  query?: string;
  eventStatus?: "future" | "past";
  city?: string;
  talentId?: string;
  participationStatus?: "confirmed" | "pending";
  startDate?: string;
  endDate?: string;
  sort?: "relevance" | "upcoming" | "recent" | "lineupSize";
}

function getArchiveCountForTalent(state: ContentState, talentId: string) {
  return state.archives.reduce(
    (count, archive) => count + archive.entries.filter((entry) => entry.talentId === talentId).length,
    0
  );
}

function getFutureEventCountForTalent(state: ContentState, talentId: string) {
  return state.lineups.filter(
    (lineup) =>
      lineup.talentId === talentId &&
      state.events.some((event) => event.id === lineup.eventId && event.status === "future")
  ).length;
}

function buildTalentSummary(state: ContentState, talent: Talent, relevanceScore?: number): TalentSummary {
  const assetMap = byId(state.assets);
  const relatedEvents = state.events.filter((event) =>
    state.lineups.some((lineup) => lineup.eventId === event.id && lineup.talentId === talent.id)
  );
  const latestEvent = sortEventsChronologically(relatedEvents).at(-1);

  return {
    id: talent.id,
    slug: talent.slug,
    nickname: talent.nickname,
    bio: talent.bio,
    aliases: talent.aliases,
    tags: talent.tags,
    cover: assetMap.get(talent.coverAssetId)!,
    recentHint: latestEvent ? `${latestEvent.city} · ${latestEvent.name}` : null,
    hasFutureEvent: relatedEvents.some((event) => event.status === "future"),
    archiveCount: getArchiveCountForTalent(state, talent.id),
    relevanceScore
  };
}

function getTalentRelevanceScore(state: ContentState, talent: Talent, terms: string[]) {
  if (terms.length === 0) return 0;

  const lineups = state.lineups.filter((lineup) => lineup.talentId === talent.id);
  const lineupEvents = state.events.filter((event) => lineups.some((lineup) => lineup.eventId === event.id));

  return (
    scoreTerms(talent.nickname, terms, 8) +
    scoreTerms(talent.aliases.join(" "), terms, 6) +
    scoreTerms(talent.tags.join(" "), terms, 4) +
    scoreTerms(talent.searchKeywords.join(" "), terms, 3) +
    scoreTerms(talent.bio, terms, 2) +
    scoreTerms(
      lineupEvents.map((event) => `${event.name} ${event.city} ${event.venue}`).join(" "),
      terms,
      1
    )
  );
}

function getEventRelevanceScore(state: ContentState, event: Event, terms: string[]) {
  if (terms.length === 0) return 0;

  const lineupTalents = state.lineups
    .filter((lineup) => lineup.eventId === event.id)
    .map((lineup) => state.talents.find((talent) => talent.id === lineup.talentId))
    .filter(Boolean) as Talent[];

  return (
    scoreTerms(event.name, terms, 8) +
    scoreTerms(event.aliases.join(" "), terms, 6) +
    scoreTerms(event.city, terms, 4) +
    scoreTerms(event.venue, terms, 3) +
    scoreTerms(event.searchKeywords.join(" "), terms, 3) +
    scoreTerms(event.note, terms, 2) +
    scoreTerms(
      lineupTalents.map((talent) => `${talent.nickname} ${talent.aliases.join(" ")} ${talent.tags.join(" ")}`).join(" "),
      terms,
      2
    )
  );
}

function buildEventSummary(state: ContentState, event: Event, relevanceScore?: number): EventSummary {
  const assetMap = byId(state.assets);
  const talentMap = byId(state.talents);
  const lineups = state.lineups
    .filter((lineup) => lineup.eventId === event.id)
    .map((lineup) => {
      const talent = talentMap.get(lineup.talentId)!;
      return {
        lineup,
        talent,
        cover: assetMap.get(talent.coverAssetId)!
      };
    });

  return {
    event,
    lineups,
    lineupSize: lineups.length,
    relevanceScore
  };
}

function buildTagSpotlights(state: ContentState): HomepageDiscovery["tagSpotlights"] {
  const counts = new Map<string, number>();
  for (const talent of state.talents) {
    for (const tag of talent.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 6)
    .map(([tag, count]) => ({
      tag: tag as Talent["tags"][number],
      count,
      href: `/talents?tag=${encodeURIComponent(tag)}`
    }));
}

export function getEditors(state: ContentState) {
  return state.editors;
}

export function getHomepageCollections(state: ContentState): HomepageDiscovery {
  const recentTalents = listTalents(state, { sort: "recent" });
  const futureEvents = listEventSummaries(state, { eventStatus: "future", sort: "upcoming" });

  return {
    featuredTalents: recentTalents.slice(0, 3),
    futureEvents: futureEvents.slice(0, 3),
    recentTalents: recentTalents.slice(0, 6),
    tagSpotlights: buildTagSpotlights(state),
    editorSpotlights: state.editors.map((editor) => ({
      editor,
      href: `/ladder?editor=${editor.slug}`,
      summary: editor.intro
    })),
    ladderSpotlights: state.ladders.map((ladder) => ({
      ladder,
      topTier:
        [...ladder.tiers].sort((a, b) => a.order - b.order).find((tier) => tier.talentIds.length > 0) ??
        ladder.tiers[0],
      href: `/ladder?editor=${state.editors.find((editor) => editor.id === ladder.editorId)?.slug ?? ""}`
    }))
  };
}

export function listTalents(state: ContentState, filters: TalentFilters = {}): TalentSummary[] {
  const queryTerms = splitQuery(filters.query);

  const filtered = state.talents
    .map((talent) => ({
      talent,
      relevanceScore: getTalentRelevanceScore(state, talent, queryTerms)
    }))
    .filter(({ talent, relevanceScore }) => {
      const haystacks = [
        talent.nickname,
        talent.aliases.join(" "),
        talent.tags.join(" "),
        talent.searchKeywords.join(" "),
        talent.bio
      ];
      const matchesQuery = queryTerms.length === 0 || (relevanceScore > 0 && includesEveryTerm(haystacks, queryTerms));
      const matchesTag = !filters.tag || talent.tags.includes(filters.tag as Talent["tags"][number]);
      const matchesFuture = !filters.onlyFuture || getFutureEventCountForTalent(state, talent.id) > 0;

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

  const sort = filters.sort ?? (queryTerms.length > 0 ? "relevance" : "recent");

  filtered.sort((left, right) => {
    if (sort === "relevance") {
      return (
        right.relevanceScore - left.relevanceScore ||
        getFutureEventCountForTalent(state, right.talent.id) - getFutureEventCountForTalent(state, left.talent.id) ||
        Date.parse(right.talent.updatedAt) - Date.parse(left.talent.updatedAt)
      );
    }
    if (sort === "future") {
      return (
        getFutureEventCountForTalent(state, right.talent.id) - getFutureEventCountForTalent(state, left.talent.id) ||
        Date.parse(right.talent.updatedAt) - Date.parse(left.talent.updatedAt)
      );
    }
    if (sort === "archiveCount") {
      return (
        getArchiveCountForTalent(state, right.talent.id) - getArchiveCountForTalent(state, left.talent.id) ||
        Date.parse(right.talent.updatedAt) - Date.parse(left.talent.updatedAt)
      );
    }
    return Date.parse(right.talent.updatedAt) - Date.parse(left.talent.updatedAt);
  });

  return filtered.map(({ talent, relevanceScore }) => buildTalentSummary(state, talent, relevanceScore));
}

export function listEventSummaries(state: ContentState, filters: EventFilters = {}): EventSummary[] {
  const queryTerms = splitQuery(filters.query);
  const startBoundary = parseDateBoundary(filters.startDate);
  const endBoundary = parseDateBoundary(filters.endDate, true);

  const filtered = state.events
    .map((event) => ({
      event,
      relevanceScore: getEventRelevanceScore(state, event, queryTerms)
    }))
    .filter(({ event, relevanceScore }) => {
      const eventLineups = state.lineups.filter((lineup) => lineup.eventId === event.id);
      const lineupText = eventLineups
        .map((lineup) => {
          const talent = state.talents.find((item) => item.id === lineup.talentId);
          return talent
            ? `${talent.nickname} ${talent.aliases.join(" ")} ${talent.tags.join(" ")} ${talent.searchKeywords.join(" ")}`
            : "";
        })
        .join(" ");
      const matchesQuery =
        queryTerms.length === 0 ||
        (relevanceScore > 0 &&
          includesEveryTerm(
            [
              event.name,
              event.aliases.join(" "),
              event.city,
              event.venue,
              event.searchKeywords.join(" "),
              event.note,
              lineupText
            ],
            queryTerms
          ));
      const matchesStatus = !filters.eventStatus || event.status === filters.eventStatus;
      const matchesCity = !filters.city || event.city === filters.city;
      const startsAt = Date.parse(event.startsAt);
      const matchesStartDate = startBoundary === null || startsAt >= startBoundary;
      const matchesEndDate = endBoundary === null || startsAt <= endBoundary;
      const matchesTalent =
        !filters.talentId || eventLineups.some((lineup) => lineup.talentId === filters.talentId);
      const matchesParticipation =
        !filters.participationStatus ||
        eventLineups.some((lineup) => lineup.status === filters.participationStatus);

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

  const sort =
    filters.sort ??
    (queryTerms.length > 0 ? "relevance" : filters.eventStatus === "past" ? "recent" : "upcoming");

  filtered.sort((left, right) => {
    if (sort === "relevance") {
      return (
        right.relevanceScore - left.relevanceScore ||
        Date.parse(left.event.startsAt) - Date.parse(right.event.startsAt)
      );
    }
    if (sort === "recent") {
      return Date.parse(right.event.startsAt) - Date.parse(left.event.startsAt);
    }
    if (sort === "lineupSize") {
      return (
        state.lineups.filter((lineup) => lineup.eventId === right.event.id).length -
          state.lineups.filter((lineup) => lineup.eventId === left.event.id).length ||
        Date.parse(left.event.startsAt) - Date.parse(right.event.startsAt)
      );
    }
    return Date.parse(left.event.startsAt) - Date.parse(right.event.startsAt);
  });

  return filtered.map(({ event, relevanceScore }) => buildEventSummary(state, event, relevanceScore));
}

function buildRelatedTalentSummaries(
  state: ContentState,
  relatedTalentIds: string[],
  reasonBuilder: (talent: Talent) => string
): RelatedTalentSummary[] {
  const uniqueIds = [...new Set(relatedTalentIds)];
  return uniqueIds
    .map((talentId) => state.talents.find((talent) => talent.id === talentId))
    .filter(Boolean)
    .slice(0, 4)
    .map((talent) => ({
      talent: buildTalentSummary(state, talent!),
      reason: reasonBuilder(talent!)
    }));
}

function buildRelatedEventSummaries(
  state: ContentState,
  relatedEventIds: string[],
  reasonBuilder: (event: Event) => string
): RelatedEventSummary[] {
  const uniqueIds = [...new Set(relatedEventIds)];
  return uniqueIds
    .map((eventId) => state.events.find((event) => event.id === eventId))
    .filter(Boolean)
    .slice(0, 4)
    .map((event) => ({
      event: buildEventSummary(state, event!),
      reason: reasonBuilder(event!)
    }));
}

export function getTalentDetail(state: ContentState, slug: string): TalentDetail | null {
  const assetMap = byId(state.assets);
  const talent = state.talents.find((item) => item.slug === slug);
  if (!talent) return null;

  const relatedEventIds = state.lineups
    .filter((lineup) => lineup.talentId === talent.id)
    .map((lineup) => lineup.eventId);

  const relatedEvents = state.events.filter((event) => relatedEventIds.includes(event.id));
  const futureEvents = sortEventsChronologically(relatedEvents.filter((event) => event.status === "future"));
  const pastEvents = sortEventsChronologically(relatedEvents.filter((event) => event.status === "past")).reverse();

  const archiveHits = state.archives.flatMap((archive) =>
    archive.entries.filter((entry) => entry.talentId === talent.id).map(() => archive.eventId)
  );

  const coTalentIds = state.archives
    .filter((archive) => archive.entries.some((entry) => entry.talentId === talent.id))
    .flatMap((archive) => archive.entries.map((entry) => entry.talentId))
    .filter((talentId) => talentId !== talent.id);

  const lineupTalentIds = state.lineups
    .filter((lineup) => relatedEventIds.includes(lineup.eventId) && lineup.talentId !== talent.id)
    .map((lineup) => lineup.talentId);

  const relatedTalents = buildRelatedTalentSummaries(
    state,
    [...coTalentIds, ...lineupTalentIds],
    (relatedTalent) =>
      lineupTalentIds.includes(relatedTalent.id) ? "曾在同场活动阵容中出现" : "曾在同一活动档案中被记录"
  );

  const relatedEventsForTalent = buildRelatedEventSummaries(
    state,
    [
      ...state.events
        .filter(
          (event) =>
            event.id !== talent.id &&
            state.lineups.some((lineup) => lineup.eventId === event.id && lineup.talentId === talent.id)
        )
        .map((event) => event.id),
      ...archiveHits
    ],
    (event) => (event.status === "future" ? "该达人即将参与" : "该达人曾出现在活动档案中")
  );

  return {
    talent,
    cover: assetMap.get(talent.coverAssetId)!,
    representationAssets: talent.representations.map((representation) => ({
      ...representation,
      asset: assetMap.get(representation.assetId)!
    })),
    futureEvents,
    pastEvents,
    relatedTalents,
    relatedEvents: relatedEventsForTalent.filter((item) => item.event.event.id !== talent.id),
    editorSummaries: state.editors.map((editor) => {
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
    })
  };
}

export function getEventDetail(state: ContentState, slug: string) {
  const event = state.events.find((item) => item.slug === slug);
  if (!event) return null;

  const assetMap = byId(state.assets);
  const talentMap = byId(state.talents);
  const editorMap = byId(state.editors);
  const lineups = buildEventSummary(state, event).lineups;
  const lineupTalentIds = lineups.map((item) => item.talent.id);

  const relatedEvents = state.events
    .filter((candidate) => candidate.id !== event.id)
    .map((candidate) => {
      const candidateTalentIds = state.lineups
        .filter((lineup) => lineup.eventId === candidate.id)
        .map((lineup) => lineup.talentId);
      const sharedLineupCount = candidateTalentIds.filter((talentId) => lineupTalentIds.includes(talentId)).length;
      const cityBonus = candidate.city === event.city ? 1 : 0;
      const timeDistance = Math.abs(Date.parse(candidate.startsAt) - Date.parse(event.startsAt));
      const timeBonus = timeDistance <= 1000 * 60 * 60 * 24 * 30 ? 1 : 0;
      return {
        candidate,
        score: sharedLineupCount * 3 + cityBonus + timeBonus
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || Date.parse(left.candidate.startsAt) - Date.parse(right.candidate.startsAt));

  return {
    event,
    lineups,
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
      })),
    relatedEvents: buildRelatedEventSummaries(
      state,
      relatedEvents.map((item) => item.candidate.id),
      (relatedEvent) => (relatedEvent.city === event.city ? "同城且阵容相关" : "阵容或时间接近")
    ),
    relatedTalents: buildRelatedTalentSummaries(state, lineupTalentIds, () => "当前活动阵容达人")
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

export function searchSite(
  state: ContentState,
  query: string,
  scope: "all" | "talents" | "events" = "all"
): SiteSearchResult {
  return {
    talents: scope === "events" ? [] : listTalents(state, { query, sort: "relevance" }),
    events: scope === "talents" ? [] : listEventSummaries(state, { query, sort: "relevance" })
  };
}

export function getDashboardSummary(state: ContentState, editorId: string): DashboardSummary {
  return {
    recentTalents: sortByDateDesc(state.talents).slice(0, 4),
    recentEvents: sortByDateDesc(state.events).slice(0, 4),
    upcomingEvents: sortEventsChronologically(state.events.filter((event) => event.status === "future")).slice(0, 4),
    myRecentArchives: sortByDateDesc(state.archives.filter((archive) => archive.editorId === editorId)).slice(0, 4)
  };
}

export function getEditorArchiveForEvent(state: ContentState, editorId: string, eventId: string) {
  return state.archives.find((archive) => archive.editorId === editorId && archive.eventId === eventId) ?? null;
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

export function summarizeDiscoverySections(state: ContentState): DiscoverySection<unknown>[] {
  const homepage = getHomepageCollections(state);
  return [
    {
      title: "近期活动",
      href: "/events?eventStatus=future",
      description: "按时间查看未来活动与阵容",
      items: homepage.futureEvents
    },
    {
      title: "最近更新达人",
      href: "/talents?sort=recent",
      description: "按最新更新切入内容库",
      items: homepage.recentTalents
    }
  ];
}
