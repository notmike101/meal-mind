import { expect, test } from "@playwright/test";

test("renders core MealMind pages", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Today's plan" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Plan/ })).toBeVisible();

  await page.goto("/recipes");
  await expect(page.getByRole("heading", { name: "CookLang recipe library" })).toBeVisible();
  await expect(page.getByText("Hot Honey Chicken with BBQ-Roasted Potatoes & Buttery Broccoli")).toBeVisible();
  await expect(page.getByText(/Crispy panko-coated chicken/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Instructions" })).toHaveCount(0);

  await page.getByRole("link", { name: "Details" }).first().click();
  await expect(page.getByRole("heading", { name: "Hot Honey Chicken with BBQ-Roasted Potatoes & Buttery Broccoli" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Instructions" })).toBeVisible();
  await expect(page.getByText(/Adjust racks to top and middle positions and preheat oven to 425 degrees/)).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Local planner settings" })).toBeVisible();
  await expect(page.getByLabel("AI base URL")).toHaveValue(/http:\/\/(127\.0\.0\.1:1234|ai-gateway:8080)\/v1/);
  await expect(page.getByRole("checkbox", { name: "Automatically generate next week's plan" })).toBeChecked();

  await page.goto("/shopping");
  await expect(page.getByRole("heading", { name: "Consolidated grocery list" })).toBeVisible();
  await expect(page.getByText(/No meal plan selected|Shopping list/)).toBeVisible();
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
  await expect(page.getByRole("button", { name: /Generate next week|Replace draft/ })).toBeVisible();
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
  await page.getByRole("button", { name: "Use light theme" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("mealmind-theme"))).toBe("light");

  await page.reload();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");

  await page.goto("/");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("light");

  await page.goto("/settings");
  await page.getByRole("button", { name: "Use system theme" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("mealmind-theme"))).toBe("system");
});
