import { getContentState, getHomepageData, getLadderPage } from "@/modules/content/service";
import { demoSeedState } from "@/modules/domain/seed";
import { setMockState } from "@/modules/repository/mock-store";

describe("content service security", () => {
  beforeEach(() => {
    setMockState(structuredClone(demoSeedState));
  });

  it("omits editor auth fields from the content state", async () => {
    const state = await getContentState();

    expect(state.editors[0]).not.toHaveProperty("email");
    expect(state.editors[0]).not.toHaveProperty("passwordHash");
  });

  it("keeps public editorial payloads free of editor credentials", async () => {
    const homepage = await getHomepageData();
    const ladder = await getLadderPage("lin");

    expect(homepage.editorSpotlights[0]?.editor).not.toHaveProperty("email");
    expect(homepage.editorSpotlights[0]?.editor).not.toHaveProperty("passwordHash");
    expect(ladder?.editor).not.toHaveProperty("email");
    expect(ladder?.editor).not.toHaveProperty("passwordHash");
  });
});
