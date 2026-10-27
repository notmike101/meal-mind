import { expect, test } from "@playwright/test";

test("keeps the same navigation mounted across workspace routes and history", async ({ page, request }) => {
  await request.post("http://127.0.0.1:3199/__mock/reset", { data: { scenario: "default" } });
  await page.goto("/plan");
  await expect(page.locator("html")).toHaveAttribute("data-mealmind-ready", new URL(page.url()).pathname + new URL(page.url()).search);
  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(navigation).toBeVisible();
  const original = await navigation.elementHandle();

  for (const name of ["Recipes", "Settings", "Plan"]) {
    await navigation.getByRole("link", { name, exact: true }).click();
    await expect(navigation.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("html")).toHaveAttribute("data-mealmind-ready", new URL(page.url()).pathname + new URL(page.url()).search);
    expect(await original!.evaluate((element) => element === document.querySelector('nav[aria-label="Primary navigation"]'))).toBe(true);
  }

  await page.goBack();
  await expect(navigation.getByRole("link", { name: "Settings", exact: true })).toHaveAttribute("aria-current", "page");
  expect(await original!.evaluate((element) => element.isConnected)).toBe(true);
  await page.goForward();
  await expect(navigation.getByRole("link", { name: "Plan", exact: true })).toHaveAttribute("aria-current", "page");
  expect(await original!.evaluate((element) => element.isConnected)).toBe(true);
});
