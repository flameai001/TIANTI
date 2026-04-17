import { getEventDetail, getTalentDetail, listEventSummaries, listTalents, searchSite } from "@/modules/domain/queries";
import { demoSeedState } from "@/modules/domain/seed";

describe("domain queries", () => {
  it("sorts talents by nickname pinyin and filters by mcn", () => {
    const allTalents = listTalents(demoSeedState);
    expect(allTalents.map((item) => item.slug)).toEqual(["qingluan", "yanjin", "yunmo", "zhaoying"]);

    const filtered = listTalents(demoSeedState, { mcn: "浮光社" });
    expect(filtered.map((item) => item.slug)).toEqual(["yanjin"]);
  });

  it("aggregates talent editor summary statistics", () => {
    const detail = getTalentDetail(demoSeedState, "qingluan");
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

  it("hydrates event archive layers", () => {
    const detail = getEventDetail(demoSeedState, "mist-lantern-festival");
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
    expect(results[0]?.slug).toBe("qingluan");
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
    const talentDetail = getTalentDetail(demoSeedState, "qingluan");
    const eventDetail = getEventDetail(demoSeedState, "mist-lantern-festival");
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

    expect(() => getTalentDetail(state, state.talents[0]!.slug)).not.toThrow();
    expect(() => getEventDetail(state, state.events[0]!.slug)).not.toThrow();
  });

  it("scopes search results", () => {
    const result = searchSite(demoSeedState, "青鸾", "events");
    expect(result.talents).toHaveLength(0);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it("filters talents by whether they have a future schedule", () => {
    const filtered = listTalents(demoSeedState, { hasSchedule: true });
    expect(filtered.map((item) => item.slug)).toEqual(["qingluan", "yanjin", "yunmo", "zhaoying"]);
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

    const detail = getEventDetail(state, "mist-lantern-festival");
    expect(detail?.archives[0]?.entries[0]?.sceneAsset).toBeNull();
  });

  it("builds talent timeline details from lineup notes and archive roles", () => {
    const detail = getTalentDetail(demoSeedState, "qingluan");

    expect(detail?.futureEvents[0]?.detailText).toContain("主视觉第一轮海报已出现");
    expect(detail?.pastEvents[0]?.detailText).toContain("《花朝记》春庭版");
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

    const detail = getTalentDetail(state, "qingluan");
    expect(detail?.pastEvents.map((item) => item.event.id)).not.toContain("event-past-no-archive");
  });
});
