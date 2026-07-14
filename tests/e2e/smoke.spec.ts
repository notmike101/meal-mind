import { expect, test } from "@playwright/test";

test("primary navigation renders each page on the first click", async ({ page }) => {
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  const destinations = [
    { name: "Plan", path: "/plan", heading: /Choose next week's meals|Weekly meal plan/ },
    { name: "Shopping", path: "/shopping", heading: "Consolidated grocery list" },
    { name: "Recipes", path: "/recipes", heading: "CookLang recipe library" },
    { name: "Settings", path: "/settings", heading: "Local planner settings" },
    { name: "Dashboard", path: "/", heading: "Today's plan" },
  ];

  for (const destination of destinations) {
    await navigation.getByRole("link", { name: destination.name, exact: true }).click();
    await expect(page).toHaveURL(destination.path);
    await expect(page.getByRole("heading", { name: destination.heading })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-mealmind-ready", destination.path);
  }
});

test("uses a consistent shell width across primary pages", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  const paths = ["/", "/plan", "/shopping", "/recipes", "/settings"];

  for (const path of paths) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-mealmind-ready", path);

    const geometry = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>("header > div");
      const main = document.querySelector<HTMLElement>("main");
      if (!header || !main) throw new Error("App shell containers were not rendered");

      const headerBox = header.getBoundingClientRect();
      const mainBox = main.getBoundingClientRect();
      return {
        headerLeft: headerBox.left,
        headerWidth: headerBox.width,
        mainLeft: mainBox.left,
        mainWidth: mainBox.width,
      };
    });

    expect(geometry.headerWidth).toBeCloseTo(1472, 0);
    expect(geometry.mainWidth).toBeCloseTo(1472, 0);
    expect(geometry.headerLeft).toBeCloseTo(geometry.mainLeft, 0);
  }
});

test("renders core MealMind pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Today's plan" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Plan/ })).toBeVisible();

  await page.goto("/recipes");
  await expect(page.getByRole("heading", { name: "CookLang recipe library" })).toBeVisible();
  await expect(page.getByText("Hot Honey Chicken with BBQ-Roasted Potatoes & Buttery Broccoli")).toBeVisible();
  await expect(page.getByText(/Crispy panko-coated chicken/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Instructions" })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-mealmind-ready", "/recipes");
  const recipeCard = page.locator("article")
    .filter({ hasText: "Hot Honey Chicken with BBQ-Roasted Potatoes & Buttery Broccoli" });
  await recipeCard.getByRole("link").click();
  await expect(page).toHaveURL(/\/recipes\/hot-honey-chicken-with-bbq-roasted-potatoes-buttery-broccoli$/);
  const recipeDialog = page.getByRole("dialog");
  await expect(recipeDialog).toBeVisible();
  await expect(page.getByRole("heading", { name: "CookLang recipe library" })).toBeVisible();
  await expect(recipeDialog.getByRole("heading", { name: "Hot Honey Chicken with BBQ-Roasted Potatoes & Buttery Broccoli" })).toBeVisible();
  await expect(recipeDialog.getByRole("heading", { name: "Ingredients" })).toBeVisible();
  await expect(recipeDialog.getByRole("heading", { name: "Instructions" })).toBeVisible();
  await expect(recipeDialog.getByText(/Adjust racks to top and middle positions and preheat oven to 425 degrees/)).toBeVisible();

  await recipeDialog.getByRole("button", { name: "Close recipe details" }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(recipeDialog).toHaveCount(0);

  await page.goForward();
  await expect(recipeDialog).toBeVisible();
  await page.reload();
  await expect(recipeDialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Hot Honey Chicken with BBQ-Roasted Potatoes & Buttery Broccoli" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Recipes" })).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Local planner settings" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-mealmind-ready", "/settings");
  await expect(page.getByLabel("AI base URL")).toHaveValue(/^(?!.*ai-gateway).*\/v1$/);
  await expect(page.getByLabel("AI model")).toHaveValue(/qwen3\.6-35b-a3b/);
  await page.getByRole("button", { name: "Load models" }).click();
  await expect(page.getByText(/AI endpoint reachable/)).toBeVisible();
  await expect(page.getByLabel("AI model").locator("option")).toContainText(["qwen3.6-35b-a3b"]);
  await expect(page.getByRole("checkbox", { name: "Automatically generate next week's plan" })).toBeChecked();
  await expect(page.getByLabel("Default meal servings")).toHaveValue(/\d+/);
  await expect(page.getByLabel("Weekly meals")).toHaveValue(/\d+/);

  await page.goto("/shopping");
  await expect(page.getByRole("heading", { name: "Consolidated grocery list" })).toBeVisible();
  await expect(page.getByText(/No meal plan selected|Shopping progress/)).toBeVisible();
});

test("supports direct recipe routes and missing recipe responses", async ({ page }) => {
  await page.goto("/recipes/hot-honey-chicken-with-bbq-roasted-potatoes-buttery-broccoli");
  await expect(page.getByRole("heading", { name: "Hot Honey Chicken with BBQ-Roasted Potatoes & Buttery Broccoli" })).toBeVisible();
  await expect(page.getByText(/Adjust racks to top and middle positions and preheat oven to 425 degrees/)).toBeVisible();

  const response = await page.goto("/recipes/not-a-recipe");
  expect(response?.status()).toBe(404);
});

test("plan page exposes generation controls", async ({ page }) => {
  await page.goto("/plan");
  await expect(page.getByRole("heading", { name: /Choose next week's meals|Weekly meal plan/ })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-mealmind-ready", "/plan");
  const planContent = page.getByTestId("plan-content");
  const planWorkspace = page.getByTestId("plan-workspace");
  await expect(planContent).toBeVisible();
  await expect(planWorkspace).toBeVisible();
  const [headerGap, workspaceGap] = await Promise.all([
    planContent.evaluate((element) => Number.parseFloat(getComputedStyle(element).marginTop)),
    planWorkspace.evaluate((element) => Number.parseFloat(getComputedStyle(element).marginTop)),
  ]);
  expect(headerGap).toBeGreaterThan(0);
  expect(workspaceGap).toBeCloseTo(headerGap, 1);
  const generationButton = page.getByRole("button", { name: /Generate next week|Replace draft/ });
  await expect(generationButton).toBeVisible();
  await generationButton.click();
  const generationDialog = page.getByRole("dialog");
  await expect(generationDialog).toBeVisible();
  await expect(generationDialog.getByRole("spinbutton", { name: "Number of meals" })).toHaveValue(/\d+/);
  await generationDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(generationDialog).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-mealmind-ready", "/plan");
  const recipeDetailsLink = page.getByRole("main").getByRole("link", { name: /^(Details|Recipe details)$/ }).first();
  await expect(recipeDetailsLink).toBeVisible();
  await recipeDetailsLink.click();
  await expect(page).toHaveURL(/\/recipes\/[^/]+$/);
  const recipeDialog = page.getByRole("dialog");
  await expect(recipeDialog).toBeVisible();
  await recipeDialog.getByRole("button", { name: "Close recipe details" }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(recipeDialog).toHaveCount(0);
  for (const width of [390, 768, 1280, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test("theme preference defaults to system and can be overridden", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await expect(page.getByRole("button", { name: "Use light theme" })).toHaveCount(0);

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-mealmind-ready", "/settings");
  await page.getByRole("button", { name: "Use light theme" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("mealmind-theme"))).toBe("light");

  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");

  await page.goto("/");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");

  await page.goto("/settings");
  await expect(page.locator("html")).toHaveAttribute("data-mealmind-ready", "/settings");
  await page.getByRole("button", { name: "Use system theme" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("mealmind-theme"))).toBe("system");
});
