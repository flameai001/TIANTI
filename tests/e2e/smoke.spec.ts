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

test.beforeEach(async ({ request }) => {
  await resetState(request);
});

test("public homepage renders and links into talent detail", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TIANTI" })).toBeVisible();
  await page.getByRole("link", { name: "浏览达人" }).click();
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
  await expect(page.getByTestId("talent-cover-select")).not.toHaveValue("");
  await page.getByTestId("talent-representation-upload-0").setInputFiles(sharedUploadPath);
  await expect(page.getByTestId("talent-representation-select-0")).not.toHaveValue("");
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

test("editor can upload archive assets inline and shared-photo card toggles on the public page", async ({ page }) => {
  await login(page);

  await page.goto("/admin/archives");
  await page.getByTestId("archive-note").fill("收尾验收档案备注");
  await page.getByTestId("add-archive-entry").click();
  await page.getByTestId("archive-cosplay-0").fill("Archive Test Role");
  await page.getByTestId("archive-scene-upload-0").setInputFiles(sceneUploadPath);
  await page.getByTestId("archive-scene-0").selectOption({ label: "poster-crimson" });
  await page.getByTestId("archive-shared-flag-0").check();
  await page.getByTestId("archive-shared-upload-0").setInputFiles(sharedUploadPath);
  await page.getByTestId("archive-shared-0").selectOption({ label: "shared-bloom" });
  await page.getByTestId("save-archive").click();

  const publicPage = await page.context().newPage();
  await publicPage.goto("/events/spring-gala-2026");
  await expect(publicPage.getByText("Archive Test Role")).toBeVisible();
  await expect(publicPage.getByText("无合照")).toHaveCount(0);

  const sharedButton = publicPage.getByRole("button", { name: "有合照" }).first();
  const sharedImage = publicPage.locator('img[alt="shared-bloom"]').first();
  await expect.poll(async () => sharedImage.evaluate((node) => getComputedStyle(node).opacity)).toBe("0");
  await sharedButton.click();
  await expect.poll(async () => sharedImage.evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
  await sharedButton.click();
  await expect.poll(async () => sharedImage.evaluate((node) => getComputedStyle(node).opacity)).toBe("0");
  await publicPage.close();
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

test("editor can update ladder title and see it publicly", async ({ page }) => {
  await login(page);

  await page.goto("/admin/ladder");
  await page.getByTestId("ladder-title").fill("凛的天梯榜·收尾验收");
  await page.getByTestId("save-ladder").click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("ladder-title")).toHaveValue("凛的天梯榜·收尾验收");

  await page.goto("/ladder?editor=lin");
  await expect(page.getByText("凛的天梯榜·收尾验收")).toBeVisible();
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
  await page.getByTestId("save-archive").click();

  await expect(page.getByTestId("archive-entry")).toHaveCount(3);
  await expect(page.getByTestId("archive-note")).toHaveValue("Imported archive workflow note");
  await expect(page).toHaveURL(/\/admin\/archives\?event=/);
});

test("public pages remain browsable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TIANTI" })).toBeVisible();

  await page.goto("/talents");
  await expect(page.getByRole("heading", { name: "达人发现" })).toBeVisible();

  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "活动发现" })).toBeVisible();

  await page.goto("/ladder");
  await expect(page.getByRole("heading", { name: "双编辑天梯榜" })).toBeVisible();
});
