import { removeEvent, removeTalent, saveTalent } from "@/modules/admin/mutations";
import { demoSeedState } from "@/modules/domain/seed";
import { setMockState } from "@/modules/repository/mock-store";

describe("admin mutations", () => {
  beforeEach(() => {
    setMockState(structuredClone(demoSeedState));
  });

  it("blocks deleting a referenced talent", async () => {
    await expect(removeTalent("talent-qingluan")).rejects.toThrow("仍被活动阵容或活动档案引用");
  });

  it("blocks deleting an event with archives", async () => {
    await expect(removeEvent("event-mist-lantern")).rejects.toThrow("已有关联档案");
  });

  it("creates a new talent with generated slug", async () => {
    const saved = await saveTalent({
      nickname: "新月",
      bio: "新的演示达人",
      mcn: "未签约",
      coverAssetId: "asset-cover-qingluan",
      tags: ["国风"],
      links: [],
      representations: []
    });

    expect(saved.slug).toBe("新月");
  });
});
