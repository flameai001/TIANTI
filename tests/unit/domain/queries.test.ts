import {
  getEventDetail,
  getHomepageCollections,
  getTalentDetail,
  listEventSummaries,
  listTalents,
  searchSite
} from "@/modules/domain/queries";
import { demoSeedState } from "@/modules/domain/seed";

describe("domain queries", () => {
  it("sorts talents by nickname pinyin and filters by mcn", () => {
    const allTalents = listTalents(demoSeedState);
    expect(allTalents.map((item) => item.id)).toEqual([
      "talent-qingluan",
      "talent-yanjin",
      "talent-yunmo",
      "talent-zhaoying"
    ]);

    const targetMcn = demoSeedState.talents.find((talent) => talent.id === "talent-yanjin")?.mcn ?? "";
    const filtered = listTalents(demoSeedState, { mcn: targetMcn });
    expect(filtered.map((item) => item.id)).toEqual(["talent-yanjin"]);
  });

  it("expands homepage featured talents to four cards", () => {
    const homepage = getHomepageCollections(demoSeedState);
    expect(homepage.featuredTalents).toHaveLength(4);
  });

  it("builds bio preview and future location hint from the largest future lineup, breaking ties by earlier date", () => {
    const state = structuredClone(demoSeedState);
    state.talents[0] = {
      ...state.talents[0]!,
      bio: "第一行简介\n第二行简介"
    };
    state.events.push(
      {
        id: "event-future-max-late",
        slug: "event-future-max-late",
        name: "Future Max Late",
        aliases: [],
        searchKeywords: [],
        startsAt: "2026-05-12T12:00:00.000Z",
        endsAt: "2026-05-12T12:00:00.000Z",
        city: "杭州",
        venue: "North Hall",
        status: "future",
        note: "",
        updatedAt: "2026-04-12T00:00:00.000Z"
      },
      {
        id: "event-future-max-early",
        slug: "event-future-max-early",
        name: "Future Max Early",
        aliases: [],
        searchKeywords: [],
        startsAt: "2026-05-10T12:00:00.000Z",
        endsAt: "2026-05-10T12:00:00.000Z",
        city: "苏州",
        venue: "River Stage",
        status: "future",
        note: "",
        updatedAt: "2026-04-12T00:00:00.000Z"
      }
    );
    state.lineups.push(
      {
        id: "lineup-future-max-late-1",
        eventId: "event-future-max-late",
        talentId: "talent-qingluan",
        lineupDate: "2026-05-12T12:00:00.000Z",
        status: "confirmed",
        source: "",
        note: ""
      },
      {
        id: "lineup-future-max-late-2",
        eventId: "event-future-max-late",
        talentId: "talent-yunmo",
        lineupDate: "2026-05-12T12:00:00.000Z",
        status: "confirmed",
        source: "",
        note: ""
      },
      {
        id: "lineup-future-max-late-3",
        eventId: "event-future-max-late",
        talentId: "talent-yanjin",
        lineupDate: "2026-05-12T12:00:00.000Z",
        status: "confirmed",
        source: "",
        note: ""
      },
      {
        id: "lineup-future-max-early-1",
        eventId: "event-future-max-early",
        talentId: "talent-qingluan",
        lineupDate: "2026-05-10T12:00:00.000Z",
        status: "confirmed",
        source: "",
        note: ""
      },
      {
        id: "lineup-future-max-early-2",
        eventId: "event-future-max-early",
        talentId: "talent-yunmo",
        lineupDate: "2026-05-10T12:00:00.000Z",
        status: "confirmed",
        source: "",
        note: ""
      },
      {
        id: "lineup-future-max-early-3",
        eventId: "event-future-max-early",
        talentId: "talent-yanjin",
        lineupDate: "2026-05-10T12:00:00.000Z",
        status: "confirmed",
        source: "",
        note: ""
      }
    );

    const qingluan = listTalents(state).find((item) => item.id === "talent-qingluan");

    expect(qingluan?.bioPreviewLine).toBe("第一行简介");
    expect(qingluan?.futureLocationHint).toBe("苏州 · River Stage");
  });

  it("aggregates talent editor summary statistics", () => {
    const detail = getTalentDetail(demoSeedState, "talent-qingluan");
    expect(detail).not.toBeNull();
    expect(detail?.editorSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          seenCount: 1,
          sharedPhotoCount: 1
        })
      ])
    );
  });

  it("matches detail routes by id when slugs are blank", () => {
    expect(getTalentDetail(demoSeedState, "talent-qingluan")?.talent.id).toBe("talent-qingluan");
    expect(getEventDetail(demoSeedState, "event-mist-lantern")?.event.id).toBe("event-mist-lantern");
  });

  it("resolves percent-encoded Unicode slugs for talent and event detail pages", () => {
    const state = structuredClone(demoSeedState);
    state.talents.push({
      id: "talent-unicode-slug",
      slug: "雁锦",
      nickname: "雁锦",
      bio: "",
      mcn: "",
      aliases: [],
      searchKeywords: ["雁锦"],
      tags: ["cosplay"],
      coverAssetId: null,
      links: [],
      representations: [],
      updatedAt: "2026-04-18T12:00:00.000Z"
    });
    state.events.push({
      id: "event-unicode-slug",
      slug: "萤火虫",
      name: "萤火虫",
      aliases: [],
      searchKeywords: ["萤火虫"],
      startsAt: "2026-04-18T12:00:00.000Z",
      endsAt: "2026-04-18T12:00:00.000Z",
      city: "",
      venue: "",
      status: "future",
      note: "",
      updatedAt: "2026-04-18T12:05:00.000Z"
    });

    expect(getTalentDetail(state, encodeURIComponent("雁锦"))?.talent.id).toBe("talent-unicode-slug");
    expect(getEventDetail(state, encodeURIComponent("萤火虫"))?.event.id).toBe("event-unicode-slug");
  });

  it("hydrates event archive layers", () => {
    const detail = getEventDetail(demoSeedState, "event-mist-lantern");
    expect(detail).not.toBeNull();
    expect(detail?.archives).toHaveLength(2);
    expect(detail?.archives[0]?.entries[0]?.sceneAsset?.url).toContain("/media/");
  });

  it("keeps archives grouped by editor and then date, with lineup-date backfill", () => {
    const state = structuredClone(demoSeedState);
    state.events.push({
      id: "event-archive-grouped",
      slug: "event-archive-grouped",
      name: "Archive Grouped Event",
      aliases: [],
      searchKeywords: [],
      startsAt: "2026-06-01T12:00:00.000Z",
      endsAt: "2026-06-02T12:00:00.000Z",
      city: "",
      venue: "",
      status: "future",
      note: "",
      updatedAt: "2026-04-11T00:00:00.000Z"
    });
    state.lineups.push(
      {
        id: "lineup-archive-1",
        eventId: "event-archive-grouped",
        talentId: "talent-qingluan",
        lineupDate: "2026-06-01T12:00:00.000Z",
        status: "confirmed",
        source: "",
        note: ""
      },
      {
        id: "lineup-archive-2",
        eventId: "event-archive-grouped",
        talentId: "talent-yanjin",
        lineupDate: "2026-06-02T12:00:00.000Z",
        status: "confirmed",
        source: "",
        note: ""
      }
    );
    state.archives.push({
      id: "archive-grouped",
      editorId: "editor-lin",
      eventId: "event-archive-grouped",
      note: "archive grouped",
      updatedAt: "2026-04-11T01:00:00.000Z",
      entries: [
        {
          id: "archive-grouped-entry-1",
          talentId: "talent-qingluan",
          entryDate: null,
          sceneAssetId: "asset-scene-1",
          sharedPhotoAssetId: null,
          cosplayTitle: "Role One",
          recognized: true,
          hasSharedPhoto: false
        },
        {
          id: "archive-grouped-entry-2",
          talentId: "talent-yanjin",
          entryDate: "2026-06-02T12:00:00.000Z",
          sceneAssetId: "asset-scene-2",
          sharedPhotoAssetId: null,
          cosplayTitle: "Role Two",
          recognized: true,
          hasSharedPhoto: false
        }
      ]
    });

    const detail = getEventDetail(state, "event-archive-grouped");

    expect(detail?.archives).toHaveLength(1);
    expect(detail?.archives[0]?.entryGroups.map((group) => group.date)).toEqual(["2026-06-01", "2026-06-02"]);
    expect(detail?.archives[0]?.entryGroups[0]?.items[0]?.entry.entryDate).toBe("2026-06-01T12:00:00.000Z");
  });

  it("groups multi-day lineups in ascending date order and backfills missing lineup dates", () => {
    const state = structuredClone(demoSeedState);
    state.events.push({
      id: "event-grouped",
      slug: "event-grouped",
      name: "Grouped Event",
      aliases: [],
      searchKeywords: [],
      startsAt: "2026-06-01T12:00:00.000Z",
      endsAt: "2026-06-02T12:00:00.000Z",
      city: "",
      venue: "",
      status: "future",
      note: "",
      updatedAt: "2026-04-11T00:00:00.000Z"
    });
    state.lineups.push(
      {
        id: "lineup-grouped-2",
        eventId: "event-grouped",
        talentId: "talent-yanjin",
        lineupDate: "2026-06-02T12:00:00.000Z",
        status: "confirmed",
        source: "",
        note: ""
      },
      {
        id: "lineup-grouped-1",
        eventId: "event-grouped",
        talentId: "talent-qingluan",
        lineupDate: null,
        status: "confirmed",
        source: "",
        note: ""
      }
    );

    const summary = listEventSummaries(state, { query: "Grouped Event" })[0];
    const detail = getEventDetail(state, "event-grouped");

    expect(summary?.lineupGroups.map((group) => group.date)).toEqual(["2026-06-01", "2026-06-02"]);
    expect(summary?.lineupGroups[0]?.items[0]?.talent.id).toBe("talent-qingluan");
    expect(detail?.lineupGroups.map((group) => group.date)).toEqual(["2026-06-01", "2026-06-02"]);
    expect(detail?.lineups[0]?.lineup.lineupDate).toBe("2026-06-01T12:00:00.000Z");
  });

  it("matches talent aliases in relevance search", () => {
    const results = listTalents(demoSeedState, { query: "Qingluan", sort: "relevance" });
    expect(results[0]?.id).toBe("talent-qingluan");
  });

  it("matches lineup talent names in event search", () => {
    const results = listEventSummaries(demoSeedState, { query: "Yanjin", sort: "relevance" });
    expect(results.map((item) => item.event.id)).toContain("event-echo-market");
  });

  it("filters events by a single date across ranges, single-side dates, and blank dates", () => {
    const state = structuredClone(demoSeedState);
    state.events.push(
      {
        id: "event-range",
        slug: "event-range",
        name: "Range Event",
        aliases: [],
        searchKeywords: [],
        startsAt: "2026-06-01T12:00:00.000Z",
        endsAt: "2026-06-03T12:00:00.000Z",
        city: "",
        venue: "",
        status: "future",
        note: "",
        updatedAt: "2026-04-10T00:00:00.000Z"
      },
      {
        id: "event-start-only",
        slug: "event-start-only",
        name: "Start Only",
        aliases: [],
        searchKeywords: [],
        startsAt: "2026-06-02T12:00:00.000Z",
        endsAt: null,
        city: "",
        venue: "",
        status: "future",
        note: "",
        updatedAt: "2026-04-10T00:00:00.000Z"
      },
      {
        id: "event-end-only",
        slug: "event-end-only",
        name: "End Only",
        aliases: [],
        searchKeywords: [],
        startsAt: null,
        endsAt: "2026-06-02T12:00:00.000Z",
        city: "",
        venue: "",
        status: "future",
        note: "",
        updatedAt: "2026-04-10T00:00:00.000Z"
      },
      {
        id: "event-no-date",
        slug: "event-no-date",
        name: "No Date",
        aliases: [],
        searchKeywords: [],
        startsAt: null,
        endsAt: null,
        city: "",
        venue: "",
        status: "future",
        note: "",
        updatedAt: "2026-04-10T00:00:00.000Z"
      }
    );

    const results = listEventSummaries(state, { date: "2026-06-02" });
    expect(results.map((item) => item.event.id)).toEqual(
      expect.arrayContaining(["event-range", "event-start-only", "event-end-only"])
    );
    expect(results.map((item) => item.event.id)).not.toContain("event-no-date");
  });

  it("builds related discovery sections for detail pages", () => {
    const talentDetail = getTalentDetail(demoSeedState, "talent-qingluan");
    const eventDetail = getEventDetail(demoSeedState, "event-mist-lantern");
    expect(talentDetail?.relatedTalents.length).toBeGreaterThan(0);
    expect(eventDetail?.relatedEvents.length).toBeGreaterThan(0);
  });

  it("keeps public read models stable for empty cover, empty dates, and empty public profile fields", () => {
    const state = structuredClone(demoSeedState);
    state.talents[0] = {
      ...state.talents[0],
      coverAssetId: null,
      bio: "",
      mcn: "",
      aliases: [],
      links: []
    };
    state.events[0] = {
      ...state.events[0],
      startsAt: null,
      endsAt: null,
      city: "",
      venue: "",
      note: ""
    };

    expect(() => getTalentDetail(state, state.talents[0]!.id)).not.toThrow();
    expect(() => getEventDetail(state, state.events[0]!.id)).not.toThrow();
  });

  it("scopes search results", () => {
    const result = searchSite(demoSeedState, "Qingluan", "events");
    expect(result.talents).toHaveLength(0);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it("filters talents by whether they have a future schedule", () => {
    const filtered = listTalents(demoSeedState, { hasSchedule: true });
    expect(filtered.map((item) => item.id)).toEqual([
      "talent-qingluan",
      "talent-yanjin",
      "talent-yunmo",
      "talent-zhaoying"
    ]);
  });

  it("filters events by editor archive presence", () => {
    const filtered = listEventSummaries(demoSeedState, { editorId: "editor-lin" });
    expect(filtered.map((item) => item.event.id)).toContain("event-mist-lantern");
    expect(filtered.map((item) => item.event.id)).not.toContain("event-spring-gala");
  });

  it("keeps event archive entries even when the scene asset is missing", () => {
    const state = structuredClone(demoSeedState);
    state.archives[0]!.entries[0] = {
      ...state.archives[0]!.entries[0]!,
      sceneAssetId: null
    };

    const detail = getEventDetail(state, "event-mist-lantern");
    expect(detail?.archives[0]?.entries[0]?.sceneAsset).toBeNull();
  });

  it("builds talent timeline details from lineup notes and archive roles", () => {
    const detail = getTalentDetail(demoSeedState, "talent-qingluan");
    const futureNote = demoSeedState.lineups.find((lineup) => lineup.id === "lineup-1")?.note ?? "";
    const archiveRole =
      demoSeedState.archives.find((archive) => archive.id === "archive-lin-mist")?.entries[0]?.cosplayTitle ?? "";

    expect(detail?.futureEvents[0]?.detailText).toContain(futureNote);
    expect(detail?.pastEvents[0]?.detailText).toContain(archiveRole);
  });

  it("keeps past lineup talents in history once a past multi-day event has any archive entry", () => {
    const state = structuredClone(demoSeedState);
    state.events.push({
      id: "event-partial-archive-history",
      slug: "event-partial-archive-history",
      name: "Partial Archive History",
      aliases: [],
      searchKeywords: [],
      startsAt: "2026-03-01T12:00:00.000Z",
      endsAt: "2026-03-02T12:00:00.000Z",
      city: "上海",
      venue: "Expo Center",
      status: "future",
      note: "",
      updatedAt: "2026-03-03T00:00:00.000Z"
    });
    state.lineups.push(
      {
        id: "lineup-partial-archive-1",
        eventId: "event-partial-archive-history",
        talentId: "talent-qingluan",
        lineupDate: "2026-03-01T12:00:00.000Z",
        status: "confirmed",
        source: "",
        note: "Day 1"
      },
      {
        id: "lineup-partial-archive-2",
        eventId: "event-partial-archive-history",
        talentId: "talent-yanjin",
        lineupDate: "2026-03-02T12:00:00.000Z",
        status: "confirmed",
        source: "",
        note: "Day 2"
      }
    );
    state.archives.push({
      id: "archive-partial-archive-history",
      editorId: "editor-lin",
      eventId: "event-partial-archive-history",
      note: "Only day one is archived",
      updatedAt: "2026-03-03T00:00:00.000Z",
      entries: [
        {
          id: "archive-partial-archive-entry-1",
          talentId: "talent-qingluan",
          entryDate: "2026-03-01T12:00:00.000Z",
          sceneAssetId: "asset-scene-1",
          sharedPhotoAssetId: null,
          cosplayTitle: "Day One Role",
          recognized: true,
          hasSharedPhoto: false
        }
      ]
    });

    const yanjinDetail = getTalentDetail(state, "talent-yanjin");

    expect(yanjinDetail?.pastEvents.map((item) => item.event.id)).toContain("event-partial-archive-history");
    expect(
      yanjinDetail?.pastEvents.find((item) => item.event.id === "event-partial-archive-history")?.detailText ?? null
    ).toBeNull();
  });

  it("excludes past events without archive entries from talent history", () => {
    const state = structuredClone(demoSeedState);
    state.events.push({
      id: "event-past-no-archive",
      slug: "event-past-no-archive",
      name: "Past Without Archive",
      aliases: [],
      searchKeywords: [],
      startsAt: "2026-03-01T12:00:00.000Z",
      endsAt: "2026-03-01T12:00:00.000Z",
      city: "",
      venue: "",
      status: "future",
      note: "",
      updatedAt: "2026-03-02T00:00:00.000Z"
    });
    state.lineups.push({
      id: "lineup-past-no-archive",
      eventId: "event-past-no-archive",
      talentId: "talent-qingluan",
      lineupDate: "2026-03-01T12:00:00.000Z",
      status: "confirmed",
      source: "",
      note: "Past lineup only"
    });

    const detail = getTalentDetail(state, "talent-qingluan");
    expect(detail?.pastEvents.map((item) => item.event.id)).not.toContain("event-past-no-archive");
  });
});
