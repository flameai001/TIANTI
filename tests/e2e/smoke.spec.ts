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

async function uploadAsset(
  page: Page,
  kind: "event_scene" | "shared_photo",
  filePath: string,
  title: string,
  alt: string
) {
  const uploader = page.getByTestId("asset-uploader");
  await uploader.getByTestId("asset-kind").selectOption(kind);
  await uploader.getByTestId("asset-file").setInputFiles(filePath);
  await uploader.getByTestId("asset-title").fill(title);
  await uploader.getByTestId("asset-alt").fill(alt);
  await uploader.getByTestId("asset-submit").click();
  await expect(uploader.getByText(`素材“${title}”已上传`)).toBeVisible();
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

test("editor can log in and open admin dashboard", async ({ page }) => {
  await login(page);
  await expect(page.getByText("凛 的后台")).toBeVisible();
});

test("legacy schedule and admin event routes redirect into archive views", async ({ page }) => {
  await page.goto("/schedule?q=青鸾&status=confirmed");
  await expect(page).toHaveURL(/\/events\?/);

  const scheduleUrl = new URL(page.url());
  expect(scheduleUrl.pathname).toBe("/events");
  expect(scheduleUrl.searchParams.get("eventStatus")).toBe("future");
  expect(scheduleUrl.searchParams.get("participationStatus")).toBe("confirmed");
  expect(scheduleUrl.searchParams.get("q")).toBe("青鸾");

  await login(page);
  await page.goto("/admin/events");
  await expect(page).toHaveURL(/\/admin\/archives$/);
});

test("editor can create a talent and future event that appear on public pages", async ({ page }) => {
  await login(page);

  await page.goto("/admin/talents");
  await page.getByTestId("new-talent-button").click();
  await page.locator('input[name="nickname"]').fill("Star Lume");
  await page.locator('input[name="slug"]').fill("star-lume");
  await page.locator('textarea[name="bio"]').fill("A fresh showcase talent for the V1 acceptance flow.");
  await page.locator('input[name="mcn"]').fill("Orbit Studio");
  await page.locator('input[name="tags"]').fill("cosplay, 舞台");
  await page.getByTestId("save-talent").click();
  await expect(page.getByRole("heading", { name: "编辑 Star Lume" })).toBeVisible();

  await page.goto("/admin/archives");
  await page.getByTestId("new-event-button").click();
  await page.locator('input[name="name"]').fill("Starlight Expo");
  await page.locator('input[name="slug"]').fill("starlight-expo");
  await page.locator('input[name="startsAt"]').fill("2026-06-01T10:00");
  await page.locator('input[name="endsAt"]').fill("2026-06-01T18:00");
  await page.locator('input[name="city"]').fill("上海");
  await page.locator('input[name="venue"]').fill("Galaxy Hall");
  await page.getByTestId("event-note").fill("Acceptance path event for TIANTI V1.");
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
  await expect(page.getByText("Starlight Expo")).toBeVisible();
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

test("editor can upload archive assets and publish an archive entry", async ({ page }) => {
  await login(page);

  await page.goto("/admin/archives");
  await uploadAsset(page, "event_scene", sceneUploadPath, "Scene Upload", "Scene upload for archive test");
  await uploadAsset(page, "shared_photo", sharedUploadPath, "Shared Upload", "Shared upload for archive test");

  await page.getByTestId("archive-note").fill("收尾验收档案备注");
  await page.getByTestId("add-archive-entry").click();
  await page.getByTestId("archive-cosplay-0").fill("Archive Test Role");
  await page.getByTestId("archive-scene-0").selectOption({ label: "Scene Upload" });
  await page.getByTestId("archive-shared-flag-0").check();
  await page.getByTestId("archive-shared-0").selectOption({ label: "Shared Upload" });
  await page.getByTestId("save-archive").click();
  await page.waitForLoadState("networkidle");

  const publicPage = await page.context().newPage();
  await publicPage.goto("/events/spring-gala-2026");
  await expect(publicPage.getByText("Archive Test Role")).toBeVisible();
  await publicPage.close();
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
  await expect(page.getByRole("heading", { name: "达人入口页" })).toBeVisible();

  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "活动档案" })).toBeVisible();

  await page.goto("/ladder");
  await expect(page.getByRole("heading", { name: "双编辑天梯榜" })).toBeVisible();
});
