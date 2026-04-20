import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const sceneUploadPath = path.join(process.cwd(), "public", "media", "poster-crimson.svg");
const sharedUploadPath = path.join(process.cwd(), "public", "media", "shared-bloom.svg");

async function resetState(request: APIRequestContext) {
  const response = await request.post("/api/test/reset");
  expect(response.ok()).toBeTruthy();
}

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.locator('input[name="email"]').fill("lin@example.com");
  await page.locator('input[name="password"]').fill("changeme-one");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function confirmCrop(page: Page, uploadTestId: string) {
  await page.getByTestId(`${uploadTestId}-confirm-crop`).click();
}

async function waitForArchiveSaved(page: Page) {
  await expect(page.getByText(/妗ｆ宸蹭繚瀛樺埌|我的档案已保存到/)).toBeVisible();
}

async function dragByTestId(page: Page, sourceTestId: string, targetTestId: string) {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await page.getByTestId(sourceTestId).dispatchEvent("dragstart", { dataTransfer });
  await page.getByTestId(targetTestId).dispatchEvent("dragover", { dataTransfer });
  await page.getByTestId(targetTestId).dispatchEvent("drop", { dataTransfer });
  await page.getByTestId(sourceTestId).dispatchEvent("dragend", { dataTransfer });
}

test.beforeEach(async ({ request }) => {
  await resetState(request);
});

test("public homepage renders and links into talent detail", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TIANTI" })).toBeVisible();
  await page.getByTestId("home-cta-talents").click();
  await expect(page).toHaveURL(/\/talents$/);
  await page.getByRole("link", { name: "青鸾" }).first().click();
  await expect(page).toHaveURL(/\/talents\/qingluan$/);
  await expect(page.getByRole("heading", { name: "青鸾" })).toBeVisible();
});

test("legacy schedule and admin event routes redirect into archive views", async ({ page }) => {
  await page.goto("/schedule?q=青鸾&status=confirmed");
  await expect(page).toHaveURL(/\/events\?/);

  const scheduleUrl = new URL(page.url());
  expect(scheduleUrl.pathname).toBe("/events");
  expect(scheduleUrl.searchParams.get("eventStatus")).toBe("future");
  expect(scheduleUrl.searchParams.get("q")).toBe("青鸾");
  expect(scheduleUrl.searchParams.get("participationStatus")).toBeNull();

  await login(page);
  await page.goto("/admin/events");
  await expect(page).toHaveURL(/\/admin\/archives$/);
});

test("editor can create a talent with inline uploads and publish a future event", async ({ page }) => {
  await login(page);

  await page.goto("/admin/talents");
  await page.getByTestId("new-talent-button").click();
  await page.locator('input[name="nickname"]').fill("Star Lume");
  await page.locator('textarea[name="bio"]').fill("A fresh showcase talent for the v3.1 acceptance flow.");
  await page.locator('input[name="mcn"]').fill("Orbit Studio");
  await page.locator('input[name="tags"]').fill("cosplay, 舞台");
  await page.getByTestId("talent-cover-upload").setInputFiles(sceneUploadPath);
  await confirmCrop(page, "talent-cover-upload");
  await expect(page.getByTestId("talent-cover-select")).toHaveCount(0);
  await expect(page.getByTestId("talent-cover-upload-clear")).toBeEnabled();
  await page.getByTestId("talent-representation-upload-0").setInputFiles(sharedUploadPath);
  await confirmCrop(page, "talent-representation-upload-0");
  await expect(page.getByTestId("talent-representation-select-0")).toHaveCount(0);
  await expect(page.getByTestId("talent-representation-upload-0-clear")).toBeEnabled();
  await page.getByTestId("save-talent").click();
  await expect(page.getByRole("heading", { name: "编辑 Star Lume" })).toBeVisible();

  await page.goto("/admin/archives");
  await page.getByTestId("new-event-button").click();
  await page.locator('input[name="name"]').fill("Starlight Expo");
  await page.locator('input[name="startsAt"]').fill("2026-06-01");
  await page.locator('input[name="endsAt"]').fill("2026-06-01");
  await page.locator('input[name="city"]').fill("上海");
  await page.locator('input[name="venue"]').fill("Galaxy Hall");
  await page.getByTestId("event-note").fill("Acceptance path event for TIANTI v3.1.");
  await page.getByTestId("add-lineup").click();
  await page.getByTestId("lineup-talent-0").selectOption({ label: "Star Lume" });
  await page.getByTestId("lineup-source-0").fill("Official announcement");
  await page.getByTestId("lineup-note-0").fill("Featured guest slot");
  await page.getByTestId("save-event").click();
  await expect(page).toHaveURL(/\/admin\/archives\?event=/);
  await expect(page.getByRole("heading", { name: "编辑 Starlight Expo" })).toBeVisible();

  await page.goto("/events?eventStatus=future&q=Star%20Lume");
  await expect(page.getByText("Starlight Expo")).toBeVisible();

  await page.goto("/talents/star-lume");
  await expect(page.getByRole("link", { name: /Starlight Expo/ }).first()).toBeVisible();
});

test("multi-day event lineups are grouped by date in admin, list cards, and detail pages", async ({ page }) => {
  await login(page);

  await page.goto("/admin/archives");
  await page.getByTestId("new-event-button").click();
  await page.locator('input[name="name"]').fill("Weekend Expo");
  await page.locator('input[name="startsAt"]').fill("2026-06-01");
  await page.locator('input[name="endsAt"]').fill("2026-06-02");
  await page.locator('input[name="city"]').fill("上海");
  await page.locator('input[name="venue"]').fill("Harbor Hall");
  await page.getByTestId("add-lineup").click();
  await page.getByTestId("lineup-talent-0").selectOption({ label: "青鸾" });
  await page.getByTestId("lineup-date-0").selectOption("2026-06-01");
  await page.getByTestId("lineup-source-0").fill("Day 1 source");
  await page.getByTestId("lineup-note-0").fill("Day 1 note");
  await page.getByTestId("add-lineup").click();
  await page.getByTestId("lineup-talent-1").selectOption({ label: "雁锦" });
  await page.getByTestId("lineup-date-1").selectOption("2026-06-02");
  await page.getByTestId("lineup-source-1").fill("Day 2 source");
  await page.getByTestId("lineup-note-1").fill("Day 2 note");
  await page.getByTestId("save-event").click();

  await page.getByTestId("add-archive-entry").click();
  await page.getByTestId("archive-talent-0").selectOption({ label: "青鸾" });
  await page.getByTestId("archive-date-0").selectOption("2026-06-01");
  await page.getByTestId("archive-cosplay-0").fill("Role Day 1");
  await page.getByTestId("archive-scene-upload-0").setInputFiles(sceneUploadPath);
  await confirmCrop(page, "archive-scene-upload-0");
  await page.getByTestId("add-archive-entry").click();
  await page.getByTestId("archive-talent-1").selectOption({ label: "雁锦" });
  await page.getByTestId("archive-date-1").selectOption("2026-06-02");
  await page.getByTestId("archive-cosplay-1").fill("Role Day 2");
  await page.getByTestId("archive-scene-upload-1").setInputFiles(sceneUploadPath);
  await confirmCrop(page, "archive-scene-upload-1");
  await page.getByTestId("archive-note").fill("Weekend Expo archive note");
  await page.getByTestId("save-archive").click();
  await waitForArchiveSaved(page);

  await page.goto("/events?eventStatus=future&q=Weekend%20Expo");
  await expect(page.getByText("Weekend Expo")).toBeVisible();
  await expect(page.getByText("06.01").last()).toBeVisible();
  await expect(page.getByText("06.02").last()).toBeVisible();
  await expect(page.getByText("Day 1 source")).toHaveCount(0);
  await expect(page.getByText("Day 2 note")).toHaveCount(0);

  await page.getByRole("link", { name: /Weekend Expo/ }).first().click();
  await expect(page.getByText("06.01").last()).toBeVisible();
  await expect(page.getByText("06.02").last()).toBeVisible();
  await expect(page.getByTestId("archive-rail-lin-2026-06-01-viewport")).toBeVisible();
  await expect(page.getByTestId("archive-rail-lin-2026-06-02-viewport")).toBeVisible();
  await expect(page.getByText("Day 1 source")).toBeVisible();
  await expect(page.getByText("Day 2 note")).toBeVisible();
  await expect(page.getByText("Role Day 1")).toBeVisible();
  await expect(page.getByText("Role Day 2")).toBeVisible();
});

test("talent field record cards link into the related event detail", async ({ page }) => {
  await page.goto("/talents/talent-qingluan");
  await expect(page.getByTestId("field-record-card-title-0")).toBeVisible();
  await expect(page.getByTestId("field-record-card-0").locator("img").first()).toBeVisible();
  await page.getByTestId("field-record-card-0").click();
  await expect(page).toHaveURL(/\/events\/event-mist-lantern$/);
});

test("editor can upload archive assets inline and shared-photo card toggles on the public page", async ({ page }) => {
  await login(page);

  await page.goto("/admin/archives");
  await page.getByTestId("archive-note").fill("收尾验收档案备注");
  await page.getByTestId("add-archive-entry").click();
  await page.getByTestId("archive-cosplay-0").fill("Archive Test Role");
  await page.getByTestId("archive-scene-upload-0").setInputFiles(sceneUploadPath);
  await confirmCrop(page, "archive-scene-upload-0");
  await expect(page.getByTestId("archive-scene-0")).toHaveCount(0);
  await expect(page.getByTestId("archive-scene-upload-0-clear")).toBeEnabled();
  await page.getByTestId("archive-shared-flag-0").check();
  await page.getByTestId("archive-shared-upload-0").setInputFiles(sharedUploadPath);
  await confirmCrop(page, "archive-shared-upload-0");
  await expect(page.getByTestId("archive-shared-0")).toHaveCount(0);
  await expect(page.getByTestId("archive-shared-upload-0-clear")).toBeEnabled();
  await page.getByTestId("save-archive").click();
  await waitForArchiveSaved(page);

  const publicPage = await page.context().newPage();
  await publicPage.goto("/events/spring-gala-2026");
  await expect(publicPage.getByText("Archive Test Role")).toBeVisible();
  await expect(publicPage.getByText("无合照")).toHaveCount(0);

  const sharedButton = publicPage.getByTestId("archive-shared-toggle").first();
  const sharedImage = publicPage.locator('img[alt="shared-bloom"]').first();
  await expect.poll(async () => sharedImage.evaluate((node) => getComputedStyle(node).opacity)).toBe("0");
  await sharedButton.click();
  await expect.poll(async () => sharedImage.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
  await sharedButton.click();
  await expect.poll(async () => sharedImage.evaluate((node) => getComputedStyle(node).opacity)).toBe("0");
  await publicPage.close();
});

test("event archive rails can page horizontally within a single editor date row", async ({ page }) => {
  await login(page);

  await page.goto("/admin/archives");
  await page.getByTestId("new-event-button").click();
  await page.locator('input[name="name"]').fill("Rail Expo");
  await page.locator('input[name="startsAt"]').fill("2026-07-01");
  await page.locator('input[name="endsAt"]').fill("2026-07-02");
  await page.locator('input[name="city"]').fill("Shanghai");
  await page.locator('input[name="venue"]').fill("Rail Hall");

  const lineupTalentIds = ["talent-qingluan", "talent-yunmo", "talent-zhaoying", "talent-yanjin"];
  for (const [index, talentId] of lineupTalentIds.entries()) {
    await page.getByTestId("add-lineup").click();

    await page.getByTestId(`lineup-talent-${index}`).selectOption(talentId);
    await page.getByTestId(`lineup-date-${index}`).selectOption("2026-07-01");
  }

  await page.getByTestId("save-event").click();
  await expect(page).toHaveURL(/\/admin\/archives\?event=/);
  await page.getByTestId("import-lineup-entries").click();
  await expect(page.getByTestId("archive-entry")).toHaveCount(4);
  await page.getByTestId("archive-copy-0").click();
  await page.getByTestId("archive-copy-0").click();
  await page.getByTestId("archive-copy-0").click();
  await page.getByTestId("archive-copy-0").click();
  await expect(page.getByTestId("archive-entry")).toHaveCount(8);

  for (const index of [0, 1, 2, 3, 4, 5, 6, 7]) {
    await page.getByTestId(`archive-cosplay-${index}`).fill(`Rail Role ${index + 1}`);
  }

  await page.getByTestId("save-archive").click();
  await waitForArchiveSaved(page);

  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/events?eventStatus=future&q=Rail%20Expo");
  await page.getByRole("link", { name: /Rail Expo/ }).first().click();

  const viewport = page.getByTestId("archive-rail-lin-2026-07-01-viewport");
  const nextButton = page.getByTestId("archive-rail-lin-2026-07-01-next");
  const prevButton = page.getByTestId("archive-rail-lin-2026-07-01-prev");

  await expect(viewport).toBeVisible();
  await expect(nextButton).toBeVisible();

  const initialScrollLeft = await viewport.evaluate((node) => node.scrollLeft);
  await nextButton.click();
  await expect.poll(async () => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(initialScrollLeft);

  await prevButton.click();
  await expect.poll(async () => viewport.evaluate((node) => node.scrollLeft)).toBeLessThan(20);
});

test("inline upload surfaces clear backend error messages", async ({ page }) => {
  await login(page);

  await page.route("**/api/admin/assets", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "R2 存储配置错误：缺少 R2_PUBLIC_BASE_URL。"
      })
    });
  });

  await page.goto("/admin/talents");
  await page.getByTestId("talent-cover-upload").setInputFiles(sceneUploadPath);
  await confirmCrop(page, "talent-cover-upload");
  await expect(page.getByText("R2 存储配置错误：缺少 R2_PUBLIC_BASE_URL。")).toBeVisible();
});

test("editor can clear a current image and save the empty state", async ({ page }) => {
  await login(page);

  await page.goto("/admin/talents");
  await expect(page.getByTestId("talent-cover-upload-clear")).toBeEnabled();
  await page.getByTestId("talent-cover-upload-clear").click();
  await expect(page.getByTestId("talent-cover-upload-clear")).toBeDisabled();
  await page.getByTestId("save-talent").click();
  await expect(page.getByText("当前未上传图片")).toBeVisible();
});

test("public filters apply automatically without a filter button", async ({ page }) => {
  await page.goto("/talents");
  await page.locator('select[name="mcn"]').selectOption("浮光社");
  await expect(page).toHaveURL(/mcn=/);
  await expect(page.getByText("雁锦")).toBeVisible();

  await page.goto("/events");
  await page.locator('select[name="eventStatus"]').selectOption("past");
  await expect(page).toHaveURL(/eventStatus=past/);
});

test("editor can update ladder subtitle while the derived title stays public", async ({ page }) => {
  await login(page);

  await page.goto("/admin/ladder");
  await expect(page.getByTestId("ladder-title")).toHaveValue("凛的天梯榜");
  await page.getByTestId("ladder-subtitle").fill("CI subtitle from smoke");
  await page.getByTestId("save-ladder").click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("ladder-title")).toHaveValue("凛的天梯榜");

  await page.goto("/ladder?editor=lin");
  await expect(page.getByRole("heading", { name: "凛的天梯榜" })).toBeVisible();
  await expect(page.getByText("CI subtitle from smoke")).toBeVisible();
});

test("editor can rename their display name and see it reflected publicly", async ({ page }) => {
  await login(page);

  await page.goto("/admin");
  await page.getByTestId("editor-name-input").fill("凛编辑");
  await page.getByTestId("save-editor-name").click();
  await page.waitForLoadState("networkidle");

  await expect(page.getByTestId("editor-name-input")).toHaveValue("凛编辑");

  await page.goto("/");
  await expect(page.getByText("凛编辑")).toBeVisible();

  await page.goto("/ladder?editor=lin");
  await expect(page.getByRole("heading", { name: "凛编辑的天梯榜" })).toBeVisible();
});

test("representation order syncs from admin sorting to the public talent detail", async ({ page }) => {
  await login(page);

  await page.goto("/admin/talents");
  await page.getByTestId("representation-title-0").fill("Representation Alpha");
  await page.getByTestId("representation-title-1").fill("Representation Beta");
  await dragByTestId(page, "representation-handle-1", "representation-drop-0");
  await expect(page.getByTestId("representation-title-0")).toHaveValue("Representation Beta");
  await expect(page.getByTestId("representation-title-1")).toHaveValue("Representation Alpha");
  const saveTalentResponse = page.waitForResponse(
    (response) => response.url().includes("/api/admin/talents/") && response.request().method() === "PUT"
  );
  await page.getByTestId("save-talent").click();
  await saveTalentResponse;

  await page.goto("/talents/talent-qingluan");
  await expect(page.getByTestId("representation-card-title-0")).toHaveText("Representation Beta");
  await expect(page.getByTestId("representation-card-title-1")).toHaveText("Representation Alpha");
});

test("ladder tier ordering syncs from admin sorting to the public ladder", async ({ page }) => {
  await login(page);

  await page.goto("/admin/ladder");
  await page.getByTestId("tier-lin-t1-talent-1").dragTo(page.getByTestId("tier-lin-t1-talent-0"));
  await page.getByTestId("save-ladder").click();
  await page.waitForLoadState("networkidle");

  await expect(page.getByTestId("tier-lin-t1-talent-0")).toContainText("昭映");
  await expect(page.getByTestId("tier-lin-t1-talent-1")).toContainText("云墨");

  await page.goto("/ladder?editor=lin");
  await expect(page.getByTestId("ladder-tier-lin-t1-talent-0")).toContainText("昭映");
  await expect(page.getByTestId("ladder-tier-lin-t1-talent-1")).toContainText("云墨");
});

test("event index can filter by editor archive presence", async ({ page }) => {
  await page.goto("/events");
  await page.locator('select[name="editor"]').selectOption("lin");
  await expect(page).toHaveURL(/editor=lin/);
  await expect(page.getByText("雾灯国风夜")).toBeVisible();
  await expect(page.getByText("春序漫展 2026")).toHaveCount(0);
});

test("admin return button routes back to the matching public section", async ({ page }) => {
  await login(page);

  await page.goto("/admin/archives");
  await page.getByTestId("return-to-site").click();
  await expect(page).toHaveURL(/\/events$/);

  await page.goto("/admin/talents");
  await page.getByTestId("return-to-site").click();
  await expect(page).toHaveURL(/\/talents$/);

  await page.goto("/admin/ladder");
  await page.getByTestId("return-to-site").click();
  await expect(page).toHaveURL(/\/ladder$/);
});

test("archive workspace can import lineup entries and duplicate a record", async ({ page }) => {
  await login(page);

  await page.goto("/admin/archives");
  await page.getByTestId("import-lineup-entries").click();
  await expect(page.getByTestId("archive-entry")).toHaveCount(2);

  await page.getByTestId("archive-copy-1").click();
  await expect(page.getByTestId("archive-entry")).toHaveCount(3);

  await page.getByTestId("archive-note").fill("Imported archive workflow note");
  await page.getByTestId("archive-cosplay-0").fill("Role One");
  await page.getByTestId("archive-cosplay-1").fill("Role Two");
  await page.getByTestId("archive-cosplay-2").fill("Role Three");
  await page.getByTestId("archive-scene-upload-0").setInputFiles(sceneUploadPath);
  await confirmCrop(page, "archive-scene-upload-0");
  await page.getByTestId("archive-scene-upload-1").setInputFiles(sceneUploadPath);
  await confirmCrop(page, "archive-scene-upload-1");
  await page.getByTestId("archive-scene-upload-2").setInputFiles(sceneUploadPath);
  await confirmCrop(page, "archive-scene-upload-2");
  await page.getByTestId("save-archive").click();

  await expect(page.getByTestId("archive-entry")).toHaveCount(3);
  await expect(page.getByTestId("archive-note")).toHaveValue("Imported archive workflow note");
});

test("public pages remain browsable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TIANTI" })).toBeVisible();

  await page.goto("/talents");
  await expect(page.getByTestId("talents-page-title")).toBeVisible();

  await page.goto("/events");
  await expect(page.getByTestId("events-page-title")).toBeVisible();

  await page.goto("/ladder");
  await expect(page.getByTestId("ladder-page-title")).toBeVisible();
});
