import {
  removeEvent,
  removeTalent,
  saveEventBulk,
  saveTalent,
  saveTalentBulk
} from "@/modules/admin/mutations";
import { demoSeedState } from "@/modules/domain/seed";
import { getMockState, setMockState } from "@/modules/repository/mock-store";

describe("admin mutations", () => {
  beforeEach(() => {
    setMockState(structuredClone(demoSeedState));
  });

  it("blocks deleting a referenced talent", async () => {
    await expect(removeTalent("talent-qingluan")).rejects.toThrow();
  });

  it("blocks deleting an event with archives", async () => {
    await expect(removeEvent("event-mist-lantern")).rejects.toThrow();
  });

  it("creates a new talent with generated slug", async () => {
    const saved = await saveTalent({
      nickname: "new-moon",
      bio: "fresh test talent",
      mcn: "independent",
      coverAssetId: "asset-cover-qingluan",
      tags: ["cosplay"],
      links: [],
      representations: []
    });

    expect(saved.slug).toBe("new-moon");
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
      bio: "temporary talent for bulk deletion coverage",
      mcn: "test-studio",
      coverAssetId: "asset-cover-qingluan",
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

  it("bulk updates event status", async () => {
    const result = await saveEventBulk({
      action: "set_status",
      ids: ["event-spring-gala", "event-echo-market"],
      status: "past"
    });

    expect(result.succeededIds).toEqual(["event-spring-gala", "event-echo-market"]);
    expect(result.blocked).toHaveLength(0);

    const state = getMockState();
    expect(state.events.find((event) => event.id === "event-spring-gala")?.status).toBe("past");
    expect(state.events.find((event) => event.id === "event-echo-market")?.status).toBe("past");
  });

  it("bulk deletes deletable events and removes their lineups", async () => {
    const result = await saveEventBulk({
      action: "delete",
      ids: ["event-echo-market", "missing-event"]
    });

    expect(result.succeededIds).toEqual(["event-echo-market"]);
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0]?.id).toBe("missing-event");

    const state = getMockState();
    expect(state.events.some((event) => event.id === "event-echo-market")).toBe(false);
    expect(state.lineups.some((lineup) => lineup.eventId === "event-echo-market")).toBe(false);
  });
});
