import path from "node:path";
import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";

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

async function expectGridColumnCount(locator: Locator, expectedCount: number) {
  await expect
    .poll(async () =>
      locator.evaluate((node) =>
        getComputedStyle(node)
          .gridTemplateColumns.split(" ")
          .filter(Boolean).length
      )
    )
    .toBe(expectedCount);
}

async function addLineupViaDialog(
  page: Page,
  options: {
    talentId?: string;
    talentLabel?: string;
    status?: "confirmed" | "pending";
    source?: string;
    note?: string;
    allDates?: string[];
    dateNotes?: Record<string, string>;
  }
) {
  await page.getByTestId("add-lineup").click();
  if (options.talentId) {
    await page.getByTestId("lineup-dialog-talent").selectOption(options.talentId);
  } else if (options.talentLabel) {
    await page.getByTestId("lineup-dialog-talent").selectOption({ label: options.talentLabel });
  }

  if (options.status) {
    await page.getByTestId("lineup-dialog-status").selectOption(options.status);
  }

  if (options.source) {
    await page.getByTestId("lineup-dialog-source").fill(options.source);
  }

  if (options.allDates && options.dateNotes) {
    for (const date of options.allDates) {
      const checkbox = page.getByTestId(`lineup-dialog-date-${date}`);
      const shouldCheck = Object.prototype.hasOwnProperty.call(options.dateNotes, date);
      if ((await checkbox.isChecked()) !== shouldCheck) {
        await checkbox.setChecked(shouldCheck);
      }
      if (shouldCheck) {
        await page.getByTestId(`lineup-dialog-note-${date}`).fill(options.dateNotes[date] ?? "");
      }
    }
  } else if (options.note) {
    await page.getByTestId("lineup-dialog-note").fill(options.note);
  }

  await page.getByTestId("lineup-dialog-submit").click();
}

async function addArchiveEntriesViaDialog(
  page: Page,
  entries: Array<{ talentLabel?: string; talentId?: string; date?: string; cosplayTitle?: string }>
) {
  await page.getByTestId("add-archive-entry").click();
  for (const [index, entry] of entries.entries()) {
    if (index > 0) {
      await page.getByTestId("archive-dialog-add-row").click();
    }
    if (entry.talentId) {
      await page.getByTestId(`archive-dialog-talent-${index}`).selectOption(entry.talentId);
    } else if (entry.talentLabel) {
      await page.getByTestId(`archive-dialog-talent-${index}`).selectOption({ label: entry.talentLabel });
    }
    if (entry.date) {
      await page.getByTestId(`archive-dialog-date-${index}`).selectOption(entry.date);
    }
    if (entry.cosplayTitle) {
      await page.getByTestId(`archive-dialog-cosplay-${index}`).fill(entry.cosplayTitle);
    }
  }
  await page.getByTestId("archive-dialog-submit").click();
}

test.beforeEach(async ({ request }) => {
  await resetState(request);
});

test("public homepage renders and links into talent detail", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TIANTI" })).toBeVisible();
  await expect(page.getByText("主视觉第一轮海报已出现")).toBeVisible();
  await expect(page.getByText("UNCONFIRMED")).toBeVisible();
  await expect(page.getByText("待主办二宣")).toHaveCount(0);
  await page.getByTestId("home-cta-talents").click();
  await expect(page).toHaveURL(/\/talents$/);
  await page.getByRole("link", { name: "青鸾" }).first().click();
  await expect(page).toHaveURL(/\/talents\/(qingluan|talent-qingluan)$/);
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
  await page.getByRole("button", { name: "+ 添加代表图" }).click();
  await page.getByTestId("talent-representation-upload-0").setInputFiles(sharedUploadPath);
  await confirmCrop(page, "talent-representation-upload-0");
  await expect(page.getByTestId("talent-representation-select-0")).toHaveCount(0);
  await expect(page.getByTestId("talent-representation-upload-0-clear")).toBeEnabled();
  await page.getByTestId("save-talent").click();
  await expect(page.getByText("已保存达人「Star Lume」")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/admin/archives");
  await page.getByTestId("new-event-button").click();
  await page.locator('input[name="name"]').fill("Starlight Expo");
  await page.locator('input[name="startsAt"]').fill("2026-06-01");
  await page.locator('input[name="endsAt"]').fill("2026-06-01");
  await page.locator('input[name="city"]').fill("上海");
  await page.locator('input[name="venue"]').fill("Galaxy Hall");
  await page.getByTestId("event-note").fill("Acceptance path event for TIANTI v3.1.");
  await page.getByTestId("add-lineup").click();
  await page.getByTestId("lineup-dialog-talent").selectOption({ label: "Star Lume" });
  await expect(page.getByTestId("lineup-dialog-source")).toHaveCount(0);
  await page.getByTestId("lineup-dialog-status").selectOption("pending");
  await expect(page.getByTestId("lineup-dialog-source")).toBeVisible();
  await page.getByTestId("lineup-dialog-source").fill("Official announcement");
  await page.getByTestId("lineup-dialog-status").selectOption("confirmed");
  await expect(page.getByTestId("lineup-dialog-source")).toHaveCount(0);
  await page.getByTestId("lineup-dialog-note").fill("Featured guest slot");
  await page.getByTestId("lineup-dialog-submit").click();
  await page.getByTestId("save-event").click();
  await expect(page).toHaveURL(/\/admin\/archives\?event=/);
  await expect(page.getByText("活动「Starlight Expo」已保存。")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Starlight Expo" })).toBeVisible();

  await page.goto("/events?eventStatus=future&q=Star%20Lume");
  await expect(page.getByText("Starlight Expo")).toBeVisible();

  await page.getByRole("link", { name: /Starlight Expo/ }).first().click();
  await page.getByRole("link", { name: /Star Lume/ }).click();
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
  await addLineupViaDialog(page, {
    talentLabel: "青鸾",
    allDates: ["2026-06-01", "2026-06-02"],
    dateNotes: { "2026-06-01": "Day 1 note" }
  });
  await addLineupViaDialog(page, {
    talentLabel: "雁锦",
    allDates: ["2026-06-01", "2026-06-02"],
    dateNotes: { "2026-06-02": "Day 2 note" }
  });
  await page.getByTestId("save-event").click();

  await addArchiveEntriesViaDialog(page, [
    { talentLabel: "青鸾", date: "2026-06-01", cosplayTitle: "Role Day 1" },
    { talentLabel: "雁锦", date: "2026-06-02", cosplayTitle: "Role Day 2" }
  ]);
  await page.getByTestId("archive-scene-upload-0").setInputFiles(sceneUploadPath);
  await confirmCrop(page, "archive-scene-upload-0");
  await page.getByTestId("archive-scene-upload-1").setInputFiles(sceneUploadPath);
  await confirmCrop(page, "archive-scene-upload-1");
  await page.getByTestId("archive-note").fill("Weekend Expo archive note");
  await page.getByTestId("save-archive").click();
  await waitForArchiveSaved(page);

  await page.goto("/events?eventStatus=future&q=Weekend%20Expo");
  await expect(page.getByText("Weekend Expo")).toBeVisible();
  await expect(page.getByText("06.01").last()).toBeVisible();
  await expect(page.getByText("06.02").last()).toBeVisible();
  await expect(page.getByText("Day 1 note")).toBeVisible();
  await expect(page.getByText("Day 2 note")).toBeVisible();

  await page.getByRole("link", { name: /Weekend Expo/ }).first().click();
  await expect(page.getByText("06.01").last()).toBeVisible();
  await expect(page.getByText("06.02").last()).toBeVisible();
  await expect(page.getByTestId("archive-rail-lin-2026-06-01-viewport")).toBeVisible();
  await expect(page.getByTestId("archive-rail-lin-2026-06-02-viewport")).toBeVisible();
  await expect(page.getByText("Day 1 source")).toHaveCount(0);
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
  await addArchiveEntriesViaDialog(page, [{ talentLabel: "青鸾", date: "2026-05-01", cosplayTitle: "Archive Test Role" }]);
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
  await publicPage.goto("/events/event-spring-gala");
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
  for (const talentId of lineupTalentIds) {
    await addLineupViaDialog(page, {
      talentId,
      allDates: ["2026-07-01", "2026-07-02"],
      dateNotes: { "2026-07-01": "" }
    });
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
  await page.getByRole("button", { name: "编辑达人" }).click();
  await page.getByTestId("talent-cover-upload").setInputFiles(sceneUploadPath);
  await confirmCrop(page, "talent-cover-upload");
  await expect(page.getByText("R2 存储配置错误：缺少 R2_PUBLIC_BASE_URL。")).toBeVisible();
});

test("editor can clear a current image and save the empty state", async ({ page }) => {
  await login(page);

  await page.goto("/admin/talents");
  await page.getByRole("button", { name: "编辑达人" }).click();
  await expect(page.getByTestId("talent-cover-upload-clear")).toBeEnabled();
  await page.getByTestId("talent-cover-upload-clear").click();
  await expect(page.getByTestId("talent-cover-upload-clear")).toBeDisabled();
  await page.getByTestId("save-talent").click();
  await expect(page.getByText(/已保存达人/)).toBeVisible();
  await page.getByRole("button", { name: "编辑达人" }).click();
  await expect(page.getByText("当前未上传图片")).toBeVisible();
});

test("editor can reopen crop for an existing image", async ({ page }) => {
  await login(page);

  await page.goto("/admin/talents");
  await page.getByRole("button", { name: "编辑达人" }).click();
  await expect(page.getByTestId("talent-cover-upload-edit")).toBeVisible();
  await page.getByTestId("talent-cover-upload-edit").click();
  await expect(page.getByTestId("talent-cover-upload-crop-frame")).toBeVisible();
  await expect(page.getByTestId("talent-cover-upload-crop-zoom")).toBeVisible();
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
  await page.getByRole("button", { name: "编辑达人" }).click();
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

test("dragging ladder chips to delete returns them to the sorted unranked pool", async ({ page }) => {
  await login(page);

  await page.goto("/admin/ladder");
  await page.getByTestId("tier-lin-t0-talent-0").dragTo(page.getByTestId("tier-lin-t0-delete"));
  await page.getByTestId("tier-lin-t1-talent-0").dragTo(page.getByTestId("tier-lin-t1-delete"));

  const poolTalents = page.locator('[data-testid^="unassigned-talent-"]');
  await expect(poolTalents).toHaveCount(2);
  await expect(poolTalents.nth(0)).toHaveText("青鸾");
  await expect(poolTalents.nth(1)).toHaveText("云墨");
  await expect(page.getByTestId("tier-lin-t0-talent-0")).toHaveCount(0);
});

test("double-clicking a ladder chip returns it to the unranked pool", async ({ page }) => {
  await login(page);

  await page.goto("/admin/ladder");
  await page.getByTestId("tier-lin-t0-talent-0").dblclick();

  const poolTalents = page.locator('[data-testid^="unassigned-talent-"]');
  await expect(poolTalents).toHaveCount(1);
  await expect(poolTalents.first()).toHaveText("青鸾");
  await expect(page.getByTestId("tier-lin-t0-talent-0")).toHaveCount(0);

  await page.getByTestId("save-ladder").click();
  await page.waitForLoadState("networkidle");

  await page.goto("/ladder?editor=lin");
  await expect(page.getByTestId("ladder-tier-lin-t0-talent-0")).toHaveCount(0);
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
  await expect(page.getByTestId("site-header")).toHaveCSS("position", "static");
  await expectGridColumnCount(page.getByTestId("event-card-lineup-grid").first(), 3);

  await page.goto("/talents");
  await expect(page.getByTestId("talents-page-title")).toBeVisible();

  await page.goto("/events");
  await expect(page.getByTestId("events-page-title")).toBeVisible();
  await expectGridColumnCount(page.getByTestId("event-card-lineup-grid").first(), 3);

  await page.goto("/events/event-spring-gala");
  await expectGridColumnCount(page.getByTestId("event-detail-lineup-grid").first(), 2);

  await page.goto("/ladder");
  await expect(page.getByTestId("ladder-page-title")).toBeVisible();
});
