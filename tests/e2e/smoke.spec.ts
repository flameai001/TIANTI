import { expect, test } from "@playwright/test";

test("public homepage renders and links into talent detail", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "TIANTI" })).toBeVisible();
  await page.getByRole("link", { name: "浏览达人" }).click();
  await expect(page).toHaveURL(/\/talents$/);
  await page.getByRole("link", { name: "青鸾" }).first().click();
  await expect(page).toHaveURL(/\/talents\/qingluan$/);
  await expect(page.getByText("青鸾")).toBeVisible();
});

test("editor can log in and open admin dashboard", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByPlaceholder("邮箱").fill("lin@example.com");
  await page.getByPlaceholder("密码").fill("changeme-one");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("凛 的后台")).toBeVisible();
});
