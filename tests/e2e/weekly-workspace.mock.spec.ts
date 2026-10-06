import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import type { RecipeImportJobDto } from "@mealmind/contracts";

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
  await page.getByRole("button", { name: /Add to/ }).first().click();
  await expect(page.getByRole("heading", { name: "Citrus Chicken Bowls" })).toBeVisible();
});

test("generates, edits, swaps, skips, and commits a selected week", async ({ page, request }) => {
  const fixture = await reset(request);
  await goto(page, workspaceUrl(fixture.weeks.futureEmpty, "plan"));
  const generateTrigger = page.getByRole("button", { name: "Generate plan", exact: true });
  await generateTrigger.click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(generateTrigger).toBeFocused();
  await generateTrigger.click();
  await page.keyboard.press("Escape");
  await expect(generateTrigger).toBeFocused();
  await generateTrigger.click();
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

test("retains the draft editor without permitting mutations during an external commit refresh", async ({ page, request }) => {
  const fixture = await reset(request);
  await goto(page, workspaceUrl(fixture.weeks.next, "plan"));
  const slot = page.getByLabel("Meal slot", { exact: false });
  await slot.fill("Unsaved dinner");
  const refreshStarted = Promise.withResolvers<void>();
  const releaseRefresh = Promise.withResolvers<void>();
  await page.route(`**/api/plans/by-week/${fixture.weeks.next}`, async (route) => {
    const response = await route.fetch();
    refreshStarted.resolve();
    await releaseRefresh.promise;
    await route.fulfill({ response });
  });
  const unexpectedMutations: string[] = [];
  page.on("request", (mutation) => {
    const path = new URL(mutation.url()).pathname;
    if (path.startsWith("/api/plans/") && ["POST", "PATCH", "DELETE"].includes(mutation.method()) && !path.endsWith("/commit")) {
      unexpectedMutations.push(`${mutation.method()} ${path}`);
    }
  });
  await page.getByRole("button", { name: "Commit plan", exact: true }).click();
  await refreshStarted.promise;
  try {
    await expect(page.getByTestId("meal-editor")).toBeVisible();
    await expect(slot).toHaveValue("Unsaved dinner");
    await expect(page.getByRole("status").filter({ hasText: "Refreshing week" })).toBeVisible();
    const controls = [
      page.getByRole("button", { name: "Add meal", exact: true }).first(),
      page.getByRole("button", { name: "Save details", exact: true }),
      page.getByRole("button", { name: "AI pick", exact: true }),
      page.getByRole("button", { name: "Remove", exact: true }),
      page.getByRole("button", { name: "Choose recipe", exact: true }).first(),
    ];
    for (const control of controls) {
      await expect(control).toBeDisabled();
      await control.evaluate((element) => (element as HTMLButtonElement).click());
    }
    expect(unexpectedMutations).toEqual([]);
    await expect(slot).toHaveValue("Unsaved dinner");
  } finally {
    releaseRefresh.resolve();
  }
  await expect(page.getByText("Locked", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save details", exact: true })).toHaveCount(0);
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
  await expect(page).toHaveURL(new RegExp(`${workspaceUrl(fixture.weeks.next, "shopping").replace("?", "\\?")}$`));
  await waitForReady(page);
  await page.getByRole("checkbox").first().check();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await page.getByTestId("plan-tab").click();
  await expect(page).toHaveURL(new RegExp(`${workspaceUrl(fixture.weeks.next, "plan").replace("?", "\\?")}$`));
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
  await expect(page).toHaveURL(new RegExp(`${workspaceUrl(fixture.weeks.next, "shopping").replace("?", "\\?")}$`));
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

test("keeps the selected mobile day beside its editor and preserves unsaved inputs on resize", async ({ page, request }) => {
  const fixture = await reset(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await goto(page, workspaceUrl(fixture.weeks.next, "plan"));
  const days = page.getByRole("navigation", { name: "Choose planning day" });
  await days.getByRole("button").nth(2).click();
  const selectedDay = page.getByTestId("selected-day");
  await expect(selectedDay).toBeVisible();
  await expect(page.getByTestId("meal-editor")).toBeVisible();
  const date = await selectedDay.getAttribute("data-date");
  await expect(page.getByRole("combobox", { name: "Date", exact: true })).toHaveValue(date!);
  const slot = page.getByLabel("Meal slot", { exact: false });
  await slot.fill("Unsaved dinner");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(slot).toHaveValue("Unsaved dinner");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(slot).toHaveValue("Unsaved dinner");
  await expectNoHorizontalOverflow(page);
  const dayBox = await selectedDay.boundingBox();
  const editorBox = await page.getByTestId("meal-editor").boundingBox();
  expect(editorBox!.y - (dayBox!.y + dayBox!.height)).toBeLessThan(80);
  await selectedDay.getByRole("button", { name: /^Skip / }).click();
  await expect(selectedDay.getByRole("button", { name: /^Restore / })).toBeVisible();
  await selectedDay.getByRole("button", { name: /^Restore / }).click();
  await selectedDay.getByRole("button", { name: "Add meal", exact: true }).click();
  await expect(page.getByTestId("meal-editor").getByRole("heading")).toBeVisible();
});

test("keeps settings Save reachable while moving through the household form", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await goto(page, "/settings");
  const save = page.getByRole("button", { name: "Save", exact: true });
  await expect(save).toBeInViewport();
  await page.getByLabel("Timezone", { exact: true }).scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  await page.getByLabel("Timezone", { exact: true }).fill("America/New_York");
  await save.click();
  await expect(page.getByRole("status").filter({ hasText: "Settings saved." })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("keeps an active import and its result open when browsing or resizing the collection", async ({ page }) => {
  let complete = false;
  await page.route("**/api/recipes/imports**", async (route) => {
    const url = new URL(route.request().url());
    const isJob = url.pathname.startsWith("/api/recipes/imports/");
    const isSubmission = url.pathname === "/api/recipes/imports" && route.request().method() === "POST";
    if (!isJob && !isSubmission) return route.continue();
    const response = await route.fetch();
    const payload = await response.json() as { ok: true; data: RecipeImportJobDto };
    await route.fulfill({
      response,
      json: complete ? payload : { ...payload, data: { ...payload.data, status: "converting", recipeId: null, recipeTitle: null, completedAt: null, deduplicated: false } },
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await goto(page, "/recipes");
  const collection = page.getByRole("region", { name: "Recipe results" });
  const closedWidth = (await collection.boundingBox())!.width;
  await page.getByRole("button", { name: "Import recipe", exact: true }).click();
  const disclosure = page.locator("#recipe-import-disclosure");
  await expect(disclosure.locator("summary")).toBeFocused();
  await expect.poll(async () => (await collection.boundingBox())!.width).toBeLessThan(closedWidth * 0.9);
  await disclosure.getByLabel("Recipe URL", { exact: true }).fill("https://example.test/recipe");
  await disclosure.getByRole("button", { name: "Import", exact: true }).click();
  await expect(disclosure.getByRole("status")).toContainText("Converting to CookLang");
  await disclosure.locator("summary").click();
  await expect(disclosure).toHaveAttribute("open", "");
  await page.getByRole("searchbox", { name: "Search recipes" }).fill("no matching recipe");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(disclosure.getByRole("status")).toBeVisible();
  complete = true;
  await expect(disclosure.getByRole("link", { name: "View recipe" })).toBeVisible();
  await expect(disclosure).toHaveAttribute("open", "");
  await disclosure.locator("summary").click();
  await expect(disclosure).not.toHaveAttribute("open", "");
  await page.getByRole("searchbox", { name: "Search recipes" }).fill("");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(async () => (await collection.boundingBox())!.width).toBeGreaterThan(closedWidth * 0.95);
  await expectNoHorizontalOverflow(page);
});

test("preserves recipe-modal history and responsive theme behavior", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await goto(page, "/");
  await expectNoHorizontalOverflow(page);
  const origin = page.url();
  const recipeTrigger = page.getByRole("link", { name: "Citrus Chicken Bowls" }).first();
  await recipeTrigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/recipes\/citrus-chicken-bowls$/);
  await page.getByRole("button", { name: "Close recipe details" }).click();
  await expect(page).toHaveURL(origin);
  await expect(recipeTrigger).toBeFocused();
  await page.goForward();
  await expect(page.getByRole("dialog")).toBeVisible();

  await goto(page, "/settings");
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await waitForReady(page);
  await expect(page.getByRole("button", { name: "Use dark theme" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Use system theme" })).toHaveAttribute("aria-pressed", "false");
  await goto(page, "/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expectNoHorizontalOverflow(page);

  await goto(page, "/settings");
  await page.getByRole("button", { name: "Use light theme" }).click();
  await page.reload();
  await waitForReady(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "Use light theme" })).toHaveAttribute("aria-pressed", "true");

  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("button", { name: "Use system theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(consoleErrors).toEqual([]);
});

test("configures a provider with a private key and a manual model, then removes authentication", async ({ page, request }) => {
  const fakeKey = "fake-e2e-provider-key";
  const endpoint = "https://provider.example.test/v1";
  const manualModel = "private-model-not-in-catalog";
  await goto(page, "/settings");
  const keyInput = page.getByLabel("API key (optional)", { exact: true });
  const authStatus = page.locator("p[aria-live='polite']").filter({ hasText: /Authentication token:/ });
  await expect(keyInput).toHaveAttribute("type", "password");
  await expect(keyInput).toHaveValue("");
  await page.getByLabel("AI base URL", { exact: true }).fill(endpoint);
  await keyInput.fill(fakeKey);
  const discovery = page.waitForResponse((response) => response.url().endsWith("/api/settings/test-ai") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Load models", exact: true }).click();
  const discoveryResponse = await discovery;
  expect(await discoveryResponse.json()).toMatchObject({ ok: true, data: { authConfigured: true } });
  await expect(page.locator("datalist option[value='mock-reasoner']")).toHaveCount(1);
  await page.getByLabel("AI model", { exact: true }).fill(manualModel);
  const save = page.waitForResponse((response) => response.url().endsWith("/api/settings") && response.request().method() === "PATCH");
  await page.getByRole("button", { name: /^save$/i }).click();
  const saveResponse = await save;
  expect(saveResponse.ok()).toBe(true);
  const saved = await saveResponse.json();
  expect(saved).toMatchObject({ ok: true, data: { settings: { aiBaseUrl: endpoint, aiModel: manualModel, aiAuthConfigured: true } } });
  expect(saved.data.settings).not.toHaveProperty("aiApiKey");
  expect(JSON.stringify(saved)).not.toContain(fakeKey);
  await expect(keyInput).toHaveValue("");
  await page.reload();
  await waitForReady(page);
  await expect(page.getByLabel("AI base URL", { exact: true })).toHaveValue(endpoint);
  await expect(page.getByLabel("AI model", { exact: true })).toHaveValue(manualModel);
  await expect(keyInput).toHaveValue("");
  await expect(authStatus).toContainText(/Authentication token:\s*configured\./);
  const publicResponse = await request.get("http://127.0.0.1:3199/api/settings");
  const publicSettings = await publicResponse.json();
  expect(publicSettings.data.settings).not.toHaveProperty("aiApiKey");
  expect(JSON.stringify(publicSettings)).not.toContain(fakeKey);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(fakeKey);
  expect(page.url()).not.toContain(fakeKey);
  await page.getByLabel("AI base URL", { exact: true }).fill(`${endpoint}/`);
  await expect(authStatus).toContainText(/Authentication token:\s*configured\./);
  const reuseDiscovery = page.waitForResponse((response) => response.url().endsWith("/api/settings/test-ai") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Load models", exact: true }).click();
  const reuseResponse = await reuseDiscovery;
  expect(reuseResponse.request().postDataJSON()).not.toHaveProperty("aiApiKey");
  expect(await reuseResponse.json()).toMatchObject({ ok: true, data: { authConfigured: true } });
  await page.getByLabel("AI base URL", { exact: true }).fill("https://another-provider.example.test/v1");
  await expect(authStatus).toContainText(/Authentication token:\s*not configured \(optional\)\./);
  const newEndpointDiscovery = page.waitForResponse((response) => response.url().endsWith("/api/settings/test-ai") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Load models", exact: true }).click();
  const newEndpointResponse = await newEndpointDiscovery;
  expect(newEndpointResponse.request().postDataJSON()).not.toHaveProperty("aiApiKey");
  expect(await newEndpointResponse.json()).toMatchObject({ ok: true, data: { authConfigured: false } });
  await expect(page.getByLabel("AI model", { exact: true })).toHaveValue(manualModel);
  await page.getByLabel("AI base URL", { exact: true }).fill(endpoint);
  await expect(authStatus).toContainText(/Authentication token:\s*configured\./);

  await page.getByRole("button", { name: "Remove API key", exact: true }).click();
  const remove = page.waitForResponse((response) => response.url().endsWith("/api/settings") && response.request().method() === "PATCH");
  await page.getByRole("button", { name: /^save$/i }).click();
  const removeResponse = await remove;
  expect(await removeResponse.json()).toMatchObject({ ok: true, data: { settings: { aiAuthConfigured: false, aiModel: manualModel } } });
  expect(removeResponse.request().postDataJSON()).toHaveProperty("aiApiKey", null);
  await expect(keyInput).toHaveValue("");
  await expect(authStatus).toContainText(/Authentication token:\s*not configured \(optional\)\./);
  const removedDiscovery = page.waitForResponse((response) => response.url().endsWith("/api/settings/test-ai") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Load models", exact: true }).click();
  const removedDiscoveryResponse = await removedDiscovery;
  expect(removedDiscoveryResponse.request().postDataJSON()).not.toHaveProperty("aiApiKey");
  expect(await removedDiscoveryResponse.json()).toMatchObject({ ok: true, data: { authConfigured: false } });
  await page.reload();
  await waitForReady(page);
  await expect(keyInput).toHaveValue("");
  await expect(authStatus).toContainText(/Authentication token:\s*not configured \(optional\)\./);
});

test("keeps a manual model save available when model discovery fails", async ({ page, request }) => {
  await reset(request, "discovery-failure");
  await goto(page, "/settings");
  await page.getByLabel("AI base URL", { exact: true }).fill("https://offline-provider.example.test/v1");
  await page.getByLabel("AI model", { exact: true }).fill("manual-offline-model");
  const discovery = page.waitForResponse((response) => response.url().endsWith("/api/settings/test-ai") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Load models", exact: true }).click();
  expect((await discovery).ok()).toBe(false);
  await expect(page.getByLabel("AI model", { exact: true })).toHaveValue("manual-offline-model");
  const save = page.waitForResponse((response) => response.url().endsWith("/api/settings") && response.request().method() === "PATCH");
  await page.getByRole("button", { name: /^save$/i }).click();
  expect((await save).ok()).toBe(true);
  await page.reload();
  await waitForReady(page);
  await expect(page.getByLabel("AI model", { exact: true })).toHaveValue("manual-offline-model");
  await expect(page.getByLabel("AI base URL", { exact: true })).toHaveValue("https://offline-provider.example.test/v1");
});

test("mock settings preserve omitted credentials only for the normalized saved endpoint", async ({ request }) => {
  const settingsUrl = "http://127.0.0.1:3199/api/settings";
  const endpoint = "https://mock-provider.example.test/v1";
  const configured = await request.patch(settingsUrl, { data: { aiBaseUrl: endpoint, aiApiKey: "fake-mock-key" } });
  expect(configured.ok()).toBe(true);
  const configuredSettings = await configured.json();
  expect(configuredSettings.data.settings.aiAuthConfigured).toBe(true);
  expect(configuredSettings.data.settings).not.toHaveProperty("aiApiKey");
  const preserved = await request.patch(settingsUrl, { data: { aiBaseUrl: `${endpoint}/`, aiModel: "manual-preserved" } });
  expect(await preserved.json()).toMatchObject({ ok: true, data: { settings: { aiAuthConfigured: true, aiModel: "manual-preserved" } } });
  const changed = await request.patch(settingsUrl, { data: { aiBaseUrl: "https://new-mock-provider.example.test/v1" } });
  const changedSettings = await changed.json();
  expect(changedSettings.data.settings.aiAuthConfigured).toBe(false);
  expect(changedSettings.data.settings).not.toHaveProperty("aiApiKey");
  const discovery = await request.post(`${settingsUrl}/test-ai`, { data: { aiBaseUrl: "https://new-mock-provider.example.test/v1" } });
  expect(await discovery.json()).toMatchObject({ ok: true, data: { authConfigured: false } });
  const replaced = await request.patch(settingsUrl, { data: { aiApiKey: "fake-replacement-key" } });
  expect(await replaced.json()).toMatchObject({ ok: true, data: { settings: { aiAuthConfigured: true } } });
  const removed = await request.patch(settingsUrl, { data: { aiApiKey: "   " } });
  expect(await removed.json()).toMatchObject({ ok: true, data: { settings: { aiAuthConfigured: false } } });
});
