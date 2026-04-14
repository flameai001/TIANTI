import { getEventDetail, getTalentDetail, listEventSummaries, listTalents, searchSite } from "@/modules/domain/queries";
import { demoSeedState } from "@/modules/domain/seed";

describe("domain queries", () => {
  it("filters talents with future events", () => {
    const results = listTalents(demoSeedState, { onlyFuture: true });
    expect(results.every((item) => item.hasFutureEvent)).toBe(true);
    expect(results.map((item) => item.slug)).toEqual(
      expect.arrayContaining(["qingluan", "yunmo", "zhaoying", "yanjin"])
    );
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

  it("builds related discovery sections for detail pages", () => {
    const talentDetail = getTalentDetail(demoSeedState, "qingluan");
    const eventDetail = getEventDetail(demoSeedState, "mist-lantern-festival");
    expect(talentDetail?.relatedTalents.length).toBeGreaterThan(0);
    expect(eventDetail?.relatedEvents.length).toBeGreaterThan(0);
  });

  it("scopes search results", () => {
    const result = searchSite(demoSeedState, "青鸾", "events");
    expect(result.talents).toHaveLength(0);
    expect(result.events.length).toBeGreaterThan(0);
  });
});
