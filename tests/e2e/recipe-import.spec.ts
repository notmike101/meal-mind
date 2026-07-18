import { expect, test } from "@playwright/test";

test("imports a recipe through a deterministic queued job and refreshes the catalog", async ({ page }) => {
  let pollCount = 0;
  const importedRecipe = {
    id: "fixture-import-recipe",
    title: "Fixture Import Recipe",
    description: "A deterministic recipe returned by the browser fixture.",
    imageUrl: null,
    sourceUrl: "https://example.test/recipes/fixture-import",
    format: "cooklang",
    defaultServings: 2,
    suggestedSlots: ["dinner"],
    tags: ["fixture"],
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    filePath: null,
    totalTimeMinutes: 30,
    ingredientCount: 1,
    cookwareCount: 1,
    timerCount: 0,
    detailResource: "mealmind://recipes/fixture-import-recipe",
    appUrl: "/recipes/fixture-import-recipe",
  };
  const catalog = (includeImportedRecipe: boolean) => ({
    recipes: includeImportedRecipe ? [importedRecipe] : [],
    invalidRecipes: [],
    count: includeImportedRecipe ? 1 : 0,
  });
  const detail = {
    ...importedRecipe,
    ingredients: ["1 cup water"],
    instructions: "Bring the water to a simmer.",
    cooklang: {
      metadata: {},
      ingredients: [],
      cookware: [],
      timers: [],
      sections: [],
    },
  };
  const queuedJob = {
    id: "job-fixture",
    sourceUrl: importedRecipe.sourceUrl,
    status: "queued",
    recipeId: null,
    recipeTitle: null,
    error: null,
    deduplicated: false,
    createdAt: "2026-07-15T12:00:00.000Z",
    updatedAt: "2026-07-15T12:00:00.000Z",
    completedAt: null,
  };
  const completedJob = {
    ...queuedJob,
    status: "succeeded",
    recipeId: importedRecipe.id,
    recipeTitle: importedRecipe.title,
    updatedAt: "2026-07-15T12:00:02.000Z",
    completedAt: "2026-07-15T12:00:02.000Z",
  };

  await page.route("**/api/recipes**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/recipes" && request.method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data: catalog(pollCount > 1) }),
      });
      return;
    }

    if (url.pathname === "/api/recipes/imports" && request.method() === "POST") {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data: queuedJob }),
      });
      return;
    }

    if (url.pathname === "/api/recipes/imports" && request.method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data: pollCount > 1 ? [completedJob] : [] }),
      });
      return;
    }

    if (url.pathname === "/api/recipes/imports/job-fixture" && request.method() === "GET") {
      pollCount += 1;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: pollCount === 1 ? { ...queuedJob, status: "converting" } : completedJob,
        }),
      });
      return;
    }

    if (url.pathname === `/api/recipes/${importedRecipe.id}` && request.method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data: detail }),
      });
      return;
    }

    await route.continue();
  });

  await page.goto("/recipes");
  await expect(page.locator("html")).toHaveAttribute("data-mealmind-ready", "/recipes");
  const input = page.getByLabel("Recipe URL", { exact: true });
  await input.fill(" https://example.test/recipes/fixture-import ");
  await page.getByRole("button", { name: "Import", exact: true }).click();

  await expect(page.getByRole("status")).toContainText("Converting to CookLang");
  await expect(page.getByRole("status")).toContainText("Recipe imported and ready to plan", { timeout: 5_000 });
  await expect(page.getByRole("heading", { name: importedRecipe.title, exact: true })).toBeVisible();

  await page.getByRole("link", { name: "View recipe" }).click();
  await expect(page).toHaveURL("/recipes");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: importedRecipe.title, exact: true })).toBeVisible();
});
