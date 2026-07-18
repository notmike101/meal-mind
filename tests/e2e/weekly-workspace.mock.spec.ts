import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

type FixtureInfo = {
  scenario: string;
  today: string;
  weeks: {
    current: string;
    next: string;
    pastEmpty: string;
    futureEmpty: string;
    missingList: string;
  };
};

async function reset(request: APIRequestContext, scenario = "default") {
  const response = await request.post("http://127.0.0.1:3199/__mock/reset", { data: { scenario } });
  expect(response.ok()).toBe(true);
  const payload = await response.json() as { ok: true; data: FixtureInfo };
  return payload.data;
}

function workspaceUrl(week: string, view: "plan" | "shopping") {
  return `/plan?week=${week}&view=${view}`;
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

async function waitForReady(page: Page) {
  const url = new URL(page.url());
  await expect(page.locator("html")).toHaveAttribute("data-mealmind-ready", `${url.pathname}${url.search}`);
}

async function goto(page: Page, url: string) {
  await page.goto(url);
  await waitForReady(page);
}

test.beforeEach(async ({ request }) => {
  await reset(request);
});

test("redirects compatibility routes and keeps one plan across both tabs", async ({ page, request }) => {
  const fixture = await reset(request);
  await goto(page, "/");
  await expect(page).toHaveURL(new RegExp(`${workspaceUrl(fixture.weeks.current, "plan").replace("?", "\\?")}$`));
  const workspace = page.getByTestId("weekly-workspace");
  await expect(workspace).toHaveAttribute("data-plan-id", `plan-${fixture.weeks.current}`);

  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(navigation.getByRole("link", { name: "Plan", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Recipes", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Shopping", exact: true })).toHaveCount(0);

  const planId = await workspace.getAttribute("data-plan-id");
  await page.getByTestId("shopping-tab").click();
  await expect(page).toHaveURL(new RegExp(`${workspaceUrl(fixture.weeks.current, "shopping").replace("?", "\\?")}$`));
  await waitForReady(page);
  await expect(workspace).toHaveAttribute("data-plan-id", planId!);
  await expect(page.getByRole("heading", { name: "Shopping progress" })).toBeVisible();

  await goto(page, `/shopping?week=${fixture.weeks.next}`);
  await expect(page).toHaveURL(new RegExp(`${workspaceUrl(fixture.weeks.next, "shopping").replace("?", "\\?")}$`));
  await expect(workspace).toHaveAttribute("data-plan-id", `plan-${fixture.weeks.next}`);
  await page.getByRole("link", { name: "Previous week" }).click();
  await expect(page).toHaveURL(new RegExp(`${workspaceUrl(fixture.weeks.current, "shopping").replace("?", "\\?")}$`));
  await waitForReady(page);
});

test("falls back only when week is omitted and keeps explicit empty weeks visible", async ({ page, request }) => {
  const fixture = await reset(request, "no-current-plan");
  await goto(page, "/");
  await expect(page).toHaveURL(new RegExp(`${workspaceUrl(fixture.weeks.next, "plan").replace("?", "\\?")}$`));

  await goto(page, workspaceUrl(fixture.weeks.current, "plan"));
  await expect(page).toHaveURL(new RegExp(`${workspaceUrl(fixture.weeks.current, "plan").replace("?", "\\?")}$`));
  await expect(page.getByRole("heading", { name: "No plan for this week" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate plan" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start blank plan" })).toBeVisible();
  await expect(page.getByText("Start with a blank week to plan the current week manually.")).toBeVisible();
});

test("enforces empty-week rules and can create a blank plan with a meal", async ({ page, request }) => {
  const fixture = await reset(request);
  await goto(page, workspaceUrl(fixture.weeks.pastEmpty, "plan"));
  await expect(page.getByText("Past empty weeks are kept read-only.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate plan" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start blank plan" })).toHaveCount(0);

  await goto(page, workspaceUrl(fixture.weeks.futureEmpty, "plan"));
  await expect(page.getByRole("button", { name: "Generate plan" })).toBeVisible();
  await page.getByRole("button", { name: "Start blank plan" }).click();
  await expect(page.getByTestId("plan-content")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose a recipe" })).toBeVisible();
  await page.getByRole("button", { name: /Add to/ }).first().click();
  await expect(page.getByRole("heading", { name: "Citrus Chicken Bowls" })).toBeVisible();
});

test("generates, edits, swaps, skips, and commits a selected week", async ({ page, request }) => {
  const fixture = await reset(request);
  await goto(page, workspaceUrl(fixture.weeks.futureEmpty, "plan"));
  await page.getByRole("button", { name: "Generate plan" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("spinbutton", { name: "Number of meals" }).fill("3");
  await dialog.getByRole("button", { name: "Generate plan" }).click();
  await expect(page.getByTestId("plan-content")).toBeVisible();

  const servings = page.getByRole("group", { name: "Adjust servings" }).first();
  await servings.getByRole("button", { name: "Increase servings" }).click();
  await expect(servings.getByRole("status")).toHaveText("3");

  const tomatoCard = page.locator("article").filter({ hasText: "Tomato Basil Pasta" });
  await tomatoCard.getByRole("button", { name: "Choose recipe" }).click();
  const editingPanel = page.getByText(/^Editing /).locator("..");
  await expect(editingPanel.getByRole("heading", { name: "Tomato Basil Pasta" })).toBeVisible();

  const skipButton = page.getByRole("button", { name: /^Skip / }).last();
  const skipLabel = await skipButton.getAttribute("aria-label");
  await skipButton.click();
  await expect(page.getByRole("button", { name: skipLabel!.replace("Skip", "Restore") })).toBeVisible();

  await page.getByRole("button", { name: "Commit plan" }).click();
  await expect(page.getByText("Locked", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Commit plan" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Regenerate plan" })).toHaveCount(0);
});

test("regenerates a future draft and removes all prior plan-owned state", async ({ page, request }) => {
  const fixture = await reset(request);
  await goto(page, workspaceUrl(fixture.weeks.next, "plan"));
  const workspace = page.getByTestId("weekly-workspace");
  const oldPlanId = await workspace.getAttribute("data-plan-id");
  expect(oldPlanId).toBeTruthy();

  const skipButton = page.getByRole("button", { name: /^Skip / }).first();
  const skipLabel = await skipButton.getAttribute("aria-label");
  await skipButton.click();
  await expect(page.getByRole("button", { name: skipLabel!.replace("Skip", "Restore") })).toBeVisible();

  await page.getByTestId("shopping-tab").click();
  await waitForReady(page);
  await page.getByRole("checkbox").first().check();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await page.getByTestId("plan-tab").click();
  await waitForReady(page);

  await page.getByRole("button", { name: "Regenerate plan" }).click();
  const dialog = page.getByRole("dialog", { name: "Regenerate plan" });
  await expect(dialog.getByText(/Every meal, edit, skipped day, and shopping-list item/)).toBeVisible();
  await dialog.getByRole("spinbutton", { name: "Number of meals" }).fill("3");
  await dialog.getByRole("button", { name: "Regenerate plan" }).click();

  await expect(workspace).not.toHaveAttribute("data-plan-id", oldPlanId!);
  await expect(page.getByRole("button", { name: /^Restore / })).toHaveCount(0);

  const planResponse = await request.get(`http://127.0.0.1:3199/api/plans/by-week/${fixture.weeks.next}`);
  const planPayload = await planResponse.json() as { ok: true; data: { id: string; skippedDates: string[]; meals: unknown[] } };
  expect(planPayload.data.id).not.toBe(oldPlanId);
  expect(planPayload.data.skippedDates).toEqual([]);
  expect(planPayload.data.meals).toHaveLength(3);

  const oldListResponse = await request.get(`http://127.0.0.1:3199/api/plans/${oldPlanId}/shopping-list`);
  const oldListPayload = await oldListResponse.json() as { ok: true; data: unknown };
  expect(oldListPayload.data).toBeNull();

  await page.getByTestId("shopping-tab").click();
  await waitForReady(page);
  await expect(page.getByRole("checkbox")).toHaveCount(3);
  for (const checkbox of await page.getByRole("checkbox").all()) await expect(checkbox).not.toBeChecked();
});

test("tracks current-week adherence inside the Plan tab", async ({ page }) => {
  await goto(page, "/");
  const today = page.getByRole("heading", { name: "Today's meals" }).locator("..").locator("..");
  await expect(today).toBeVisible();
  const meal = page.locator("article").filter({ has: page.getByRole("button", { name: "Done" }) }).first();
  await meal.getByRole("button", { name: "Done" }).click();
  await expect(meal.getByText("done", { exact: true })).toBeVisible();
});

test("generates a missing locked list and persists checkbox completion by plan", async ({ page, request }) => {
  const missing = await reset(request, "missing-shopping-list");
  await goto(page, workspaceUrl(missing.weeks.current, "shopping"));
  await expect(page.getByRole("heading", { name: "No shopping list yet" })).toBeVisible();
  await page.getByRole("button", { name: "Generate list" }).click();
  await expect(page.getByRole("heading", { name: "Shopping progress" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Regenerate" })).toHaveCount(0);

  const fixture = await reset(request);
  await goto(page, workspaceUrl(fixture.weeks.current, "shopping"));
  const checkbox = page.getByRole("checkbox").first();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await page.getByTestId("plan-tab").click();
  await expect(page).toHaveURL(new RegExp(`${workspaceUrl(fixture.weeks.current, "plan").replace("?", "\\?")}$`));
  await waitForReady(page);
  await page.getByTestId("shopping-tab").click();
  await expect(page).toHaveURL(new RegExp(`${workspaceUrl(fixture.weeks.current, "shopping").replace("?", "\\?")}$`));
  await waitForReady(page);
  await expect(page.getByRole("checkbox").first()).toBeChecked();
});

test("preserves recipe-modal history and responsive theme behavior", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await goto(page, "/");
  await expectNoHorizontalOverflow(page);
  const origin = page.url();
  await page.getByRole("link", { name: "Citrus Chicken Bowls" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/recipes\/citrus-chicken-bowls$/);
  await page.getByRole("button", { name: "Close recipe details" }).click();
  await expect(page).toHaveURL(origin);
  await page.goForward();
  await expect(page.getByRole("dialog")).toBeVisible();

  await goto(page, "/settings");
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await goto(page, "/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expectNoHorizontalOverflow(page);
});
