import { getEventDetail, getTalentDetail, listTalents } from "@/modules/domain/queries";
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
});
