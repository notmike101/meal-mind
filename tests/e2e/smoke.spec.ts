import { expect, test } from "@playwright/test";

async function waitForReady(page: import("@playwright/test").Page) {
  const url = new URL(page.url());
  await expect(page.locator("html")).toHaveAttribute("data-mealmind-ready", `${url.pathname}${url.search}`);
}

test("root and shopping compatibility routes resolve into the weekly workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/plan\?week=\d{4}-\d{2}-\d{2}&view=plan$/);
  await waitForReady(page);
  const workspace = page.getByTestId("weekly-workspace");
  await expect(workspace).toBeVisible();
  const week = await workspace.getAttribute("data-week-start");
  const planId = await workspace.getAttribute("data-plan-id");

  await page.goto(`/shopping?week=${week}`);
  await expect(page).toHaveURL(new RegExp(`/plan\\?week=${week}&view=shopping$`));
  await waitForReady(page);
  await expect(workspace).toHaveAttribute("data-plan-id", planId ?? "");
  await expect(page.getByTestId("shopping-tab")).toHaveAttribute("aria-current", "page");
});

test("primary navigation contains the unified destinations", async ({ page }) => {
  await page.goto("/");
  await waitForReady(page);
  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(navigation.getByRole("link", { name: "Plan", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Recipes", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Shopping", exact: true })).toHaveCount(0);

  await navigation.getByRole("link", { name: "Recipes", exact: true }).click();
  await waitForReady(page);
  await expect(page.getByRole("heading", { name: "CookLang recipe library" })).toBeVisible();
  await navigation.getByRole("link", { name: "Settings", exact: true }).click();
  await waitForReady(page);
  await expect(page.getByRole("heading", { name: "Local planner settings" })).toBeVisible();
  await navigation.getByRole("link", { name: "Plan", exact: true }).click();
  await waitForReady(page);
  await expect(page.getByTestId("weekly-workspace")).toBeVisible();
});

test("week navigation is URL-backed and does not overflow representative viewports", async ({ page }) => {
  await page.goto("/");
  await waitForReady(page);
  const workspace = page.getByTestId("weekly-workspace");
  const originalWeek = await workspace.getAttribute("data-week-start");
  const thisWeekHref = await page.getByRole("link", { name: "This week" }).getAttribute("href");
  const thisWeek = new URL(thisWeekHref!, page.url()).searchParams.get("week");
  await page.getByRole("link", { name: "Next week" }).click();
  await waitForReady(page);
  await expect(workspace).not.toHaveAttribute("data-week-start", originalWeek!);
  await page.getByRole("link", { name: "This week" }).click();
  await waitForReady(page);
  await expect(workspace).toHaveAttribute("data-week-start", thisWeek!);

  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test("recipe details retain route-backed dialog history", async ({ page }) => {
  await page.goto("/recipes");
  await waitForReady(page);
  const firstRecipe = page.locator("article").first();
  await expect(firstRecipe).toBeVisible();
  await firstRecipe.getByRole("link").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/recipes\/[^/]+$/);
  await dialog.getByRole("button", { name: "Close recipe details" }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await page.goForward();
  await expect(dialog).toBeVisible();
});

test("theme preference remains responsive and client-local", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/settings");
  await waitForReady(page);
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  await page.getByRole("button", { name: "Use light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Use system theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
