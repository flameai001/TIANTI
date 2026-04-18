import {
  removeEvent,
  removeTalent,
  saveArchive,
  saveAsset,
  saveEvent,
  saveEventBulk,
  saveTalent,
  saveTalentBulk
} from "@/modules/admin/mutations";
import { demoSeedState } from "@/modules/domain/seed";
import { getMockState, setMockState } from "@/modules/repository/mock-store";

describe("admin mutations", () => {
  beforeEach(() => {
    setMockState(structuredClone(demoSeedState));
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-17T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cascades deleting a referenced talent and removes linked references", async () => {
    await removeTalent("talent-qingluan");

    const state = getMockState();
    expect(state.talents.some((talent) => talent.id === "talent-qingluan")).toBe(false);
    expect(state.lineups.some((lineup) => lineup.talentId === "talent-qingluan")).toBe(false);
    expect(state.archives.some((archive) => archive.entries.some((entry) => entry.talentId === "talent-qingluan"))).toBe(
      false
    );
    expect(
      state.ladders.some((ladder) => ladder.tiers.some((tier) => tier.talentIds.includes("talent-qingluan")))
    ).toBe(false);
    expect(state.assets.some((asset) => asset.id === "asset-cover-qingluan")).toBe(false);
  });

  it("cascades deleting an event with archives and archive assets", async () => {
    await removeEvent("event-mist-lantern");

    const state = getMockState();
    expect(state.events.some((event) => event.id === "event-mist-lantern")).toBe(false);
    expect(state.lineups.some((lineup) => lineup.eventId === "event-mist-lantern")).toBe(false);
    expect(state.archives.some((archive) => archive.eventId === "event-mist-lantern")).toBe(false);
    expect(state.assets.some((asset) => asset.id === "asset-scene-1")).toBe(false);
    expect(state.assets.some((asset) => asset.id === "asset-scene-2")).toBe(false);
    expect(state.assets.some((asset) => asset.id === "asset-shared-1")).toBe(false);
  });

  it("creates a new talent with generated slug and search keywords", async () => {
    const saved = await saveTalent({
      nickname: "Star Lume",
      bio: "",
      mcn: "",
      aliases: ["Star Lume CN", "Lume"],
      coverAssetId: null,
      tags: ["cosplay"],
      links: [],
      representations: []
    });

    expect(saved.slug).toBe("star-lume");
    expect(saved.searchKeywords).toEqual(expect.arrayContaining(["Star Lume", "Star Lume CN", "Lume"]));
    expect(saved.coverAssetId).toBeNull();
  });

  it("allows saving an event with blank dates and optional fields", async () => {
    const saved = await saveEvent({
      name: "Blank Event",
      startsAt: null,
      endsAt: null,
      city: "",
      venue: "",
      status: "future",
      note: "",
      lineups: []
    });

    expect(saved.slug).toBe("blank-event");
    expect(saved.startsAt).toBeNull();
    expect(saved.endsAt).toBeNull();
  });

  it("requires lineup dates for multi-day events", async () => {
    await expect(
      saveEvent({
        name: "Two Day Event",
        startsAt: "2026-06-01",
        endsAt: "2026-06-02",
        city: "",
        venue: "",
        status: "future",
        note: "",
        lineups: [
          {
            talentId: "talent-qingluan",
            lineupDate: null,
            status: "confirmed",
            source: "",
            note: ""
          }
        ]
      })
    ).rejects.toThrow("多日活动的每条达人阵容都必须选择所属日期。");
  });

  it("rejects lineup dates outside the event range", async () => {
    await expect(
      saveEvent({
        name: "Two Day Event",
        startsAt: "2026-06-01",
        endsAt: "2026-06-02",
        city: "",
        venue: "",
        status: "future",
        note: "",
        lineups: [
          {
            talentId: "talent-qingluan",
            lineupDate: "2026-06-05",
            status: "confirmed",
            source: "",
            note: ""
          }
        ]
      })
    ).rejects.toThrow("达人阵容的所属日期必须落在活动开始和结束日期之间。");
  });

  it("requires archive entry dates for multi-day events", async () => {
    await expect(
      saveArchive("editor-lin", {
        eventId: "event-spring-gala",
        note: "archive note",
        entries: [
          {
            talentId: "talent-qingluan",
            entryDate: null,
            sceneAssetId: "asset-scene-1",
            sharedPhotoAssetId: null,
            cosplayTitle: "Role One",
            recognized: true,
            hasSharedPhoto: false
          }
        ]
      })
    ).rejects.toThrow("多日活动的每条现场档案记录都必须选择所属日期。");
  });

  it("rejects archive entry dates outside the event range", async () => {
    await expect(
      saveArchive("editor-lin", {
        eventId: "event-spring-gala",
        note: "archive note",
        entries: [
          {
            talentId: "talent-qingluan",
            entryDate: "2026-06-06",
            sceneAssetId: "asset-scene-1",
            sharedPhotoAssetId: null,
            cosplayTitle: "Role One",
            recognized: true,
            hasSharedPhoto: false
          }
        ]
      })
    ).rejects.toThrow("现场档案记录的所属日期必须落在活动开始和结束日期之间。");
  });

  it("deletes cleanup candidate assets when they are no longer referenced", async () => {
    const asset = await saveAsset({
      kind: "talent_cover",
      title: "unused cover",
      alt: "unused cover",
      url: "https://example.com/unused-cover.jpg",
      width: 300,
      height: 400,
      objectKey: null
    });

    await saveTalent({
      id: "talent-qingluan",
      nickname: "Qingluan",
      bio: demoSeedState.talents[0]?.bio ?? "",
      mcn: demoSeedState.talents[0]?.mcn ?? "",
      aliases: demoSeedState.talents[0]?.aliases ?? [],
      coverAssetId: null,
      tags: demoSeedState.talents[0]?.tags ?? [],
      links: demoSeedState.talents[0]?.links ?? [],
      representations: demoSeedState.talents[0]?.representations ?? [],
      cleanupCandidateAssetIds: [asset.id]
    });

    expect(getMockState().assets.some((item) => item.id === asset.id)).toBe(false);
  });

  it("keeps cleanup candidate assets when they are still referenced elsewhere", async () => {
    const candidateAssetId = "asset-rep-1";

    await saveTalent({
      id: "talent-qingluan",
      nickname: "Qingluan",
      bio: demoSeedState.talents[0]?.bio ?? "",
      mcn: demoSeedState.talents[0]?.mcn ?? "",
      aliases: demoSeedState.talents[0]?.aliases ?? [],
      coverAssetId: "asset-cover-qingluan",
      tags: demoSeedState.talents[0]?.tags ?? [],
      links: demoSeedState.talents[0]?.links ?? [],
      representations: demoSeedState.talents[0]?.representations ?? [],
      cleanupCandidateAssetIds: [candidateAssetId]
    });

    expect(getMockState().assets.some((item) => item.id === candidateAssetId)).toBe(true);
  });

  it("bulk adds tags to selected talents", async () => {
    const result = await saveTalentBulk({
      action: "add_tags",
      ids: ["talent-qingluan", "talent-zhaoying"],
      tags: ["featured", "cosplay"]
    });

    expect(result.succeededIds).toEqual(["talent-qingluan", "talent-zhaoying"]);
    expect(result.blocked).toHaveLength(0);

    const state = getMockState();
    const qingluan = state.talents.find((talent) => talent.id === "talent-qingluan");
    const zhaoying = state.talents.find((talent) => talent.id === "talent-zhaoying");

    expect(qingluan?.tags).toContain("featured");
    expect(zhaoying?.tags).toContain("featured");
    expect(zhaoying?.tags).toContain("cosplay");
  });

  it("bulk deletes removable talents and reports blocked rows", async () => {
    const saved = await saveTalent({
      nickname: "bulk-temp",
      bio: "",
      mcn: "",
      coverAssetId: null,
      tags: [],
      links: [],
      representations: []
    });

    const result = await saveTalentBulk({
      action: "delete",
      ids: [saved.id, "missing-talent"]
    });

    expect(result.succeededIds).toEqual([saved.id]);
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0]?.id).toBe("missing-talent");
    expect(getMockState().talents.some((talent) => talent.id === saved.id)).toBe(false);
  });

  it("derives event status from dates when saving", async () => {
    const savedFuture = await saveEvent({
      id: "event-echo-market",
      name: "Echo Market Archive",
      startsAt: "2026-04-19",
      endsAt: "2026-04-20",
      city: "",
      venue: "",
      note: "",
      lineups: []
    });

    const savedPast = await saveEvent({
      id: "event-mist-lantern",
      name: "Mist Lantern Festival",
      startsAt: "2026-03-22",
      endsAt: "2026-03-22",
      city: "",
      venue: "",
      note: "",
      lineups: []
    });

    expect(savedFuture.status).toBe("future");
    expect(savedPast.status).toBe("past");
  });

  it("allows saving archive entries without a scene asset", async () => {
    const archive = await saveArchive("editor-lin", {
      eventId: "event-mist-lantern",
      note: "archive note",
      entries: [
        {
          talentId: "talent-qingluan",
          entryDate: "2026-03-22",
          sceneAssetId: null,
          sharedPhotoAssetId: null,
          cosplayTitle: "Role One",
          recognized: true,
          hasSharedPhoto: false
        }
      ]
    });

    expect(archive.entries[0]?.sceneAssetId).toBeNull();
  });

  it("bulk deletes events and cascades their lineups and archives", async () => {
    const result = await saveEventBulk({
      action: "delete",
      ids: ["event-mist-lantern", "missing-event"]
    });

    expect(result.succeededIds).toEqual(["event-mist-lantern"]);
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0]?.id).toBe("missing-event");

    const state = getMockState();
    expect(state.events.some((event) => event.id === "event-mist-lantern")).toBe(false);
    expect(state.lineups.some((lineup) => lineup.eventId === "event-mist-lantern")).toBe(false);
    expect(state.archives.some((archive) => archive.eventId === "event-mist-lantern")).toBe(false);
  });
});
