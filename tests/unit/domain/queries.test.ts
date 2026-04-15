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
    expect(detail?.archives[0]?.entries[0]?.sceneAsset.url).toContain("/media/");
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
});
