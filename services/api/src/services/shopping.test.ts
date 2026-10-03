// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiConnectionSettings, MealPlanDto, SettingsDto } from "@mealmind/contracts";
import { parseRecipeCooklang } from "@mealmind/domain";

const mocks = vi.hoisted(() => ({
  createAiEvent: vi.fn(),
  getPlanWithMeals: vi.fn(),
  getSettings: vi.fn(),
  getSettingsWithPantry: vi.fn(),
  getPantryStaples: vi.fn(),
  getShoppingListForPlan: vi.fn(),
  deleteShoppingListForPlan: vi.fn(),
  replaceShoppingList: vi.fn(),
  getAvailableRecipes: vi.fn(),
}));

vi.mock("@mealmind/db/repositories/ai-events", () => ({ createAiEvent: mocks.createAiEvent }));
vi.mock("@mealmind/db/repositories/plans", () => ({ getPlanWithMeals: mocks.getPlanWithMeals }));
vi.mock("@mealmind/db/repositories/settings", () => ({
  getSettings: mocks.getSettings,
  getSettingsWithPantry: mocks.getSettingsWithPantry,
  getPantryStaples: mocks.getPantryStaples,
}));
vi.mock("@mealmind/db/repositories/shopping", () => ({
  getShoppingListForPlan: mocks.getShoppingListForPlan,
  deleteShoppingListForPlan: mocks.deleteShoppingListForPlan,
  replaceShoppingList: mocks.replaceShoppingList,
}));
vi.mock("../recipes.js", () => ({ getAvailableRecipes: mocks.getAvailableRecipes }));

import { generateShoppingList } from "./shopping.js";

const settings: SettingsDto = {
  id: 1,
  timezone: "America/Chicago",
  aiBaseUrl: "https://shopping-provider.example/v1",
  aiModel: "shopping-model",
  planningPreferences: "",
  planningVarietyRules: "",
  defaultMealServings: 2,
  defaultWeeklyMealCount: 1,
  autoGenerateNextWeek: true,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const recipe = parseRecipeCooklang(`---
id: rice-recipe
title: Rice
servings: 2
---
Cook @rice{1%cup}.
`, "recipes/rice.cook");

const plan: MealPlanDto = {
  id: "plan-1",
  weekStart: "2026-07-20",
  weekEnd: "2026-07-26",
  status: "draft",
  creationSource: "ai",
  commitSource: null,
  committedAt: null,
  createdAt: "2026-07-18T00:00:00.000Z",
  aiModel: settings.aiModel,
  aiBaseUrl: settings.aiBaseUrl,
  aiPromptHash: null,
  skippedDates: [],
  meals: [{
    id: "meal-1",
    planId: "plan-1",
    date: "2026-07-20",
    slot: "Dinner",
    recipeId: recipe.id,
    recipeTitleSnapshot: recipe.title,
    servings: 2,
    status: "planned",
    swapCount: 0,
    notes: "",
    sortOrder: 0,
  }],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", "environment-token");
  mocks.getPlanWithMeals.mockResolvedValue(plan);
  mocks.getShoppingListForPlan.mockResolvedValue(null);
  mocks.getPantryStaples.mockResolvedValue([]);
  mocks.getAvailableRecipes.mockResolvedValue([recipe]);
  mocks.replaceShoppingList.mockResolvedValue({ id: "shopping-list-1" });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("generateShoppingList provider credentials", () => {
  it.each([
    { aiApiKey: "saved-shopping-token", authorization: "Bearer saved-shopping-token" },
    { aiApiKey: null, authorization: null },
  ])("uses private key $aiApiKey at the provider boundary", async ({ aiApiKey, authorization }) => {
    const privateSettings: SettingsDto & AiConnectionSettings = { ...settings, aiApiKey };
    mocks.getSettings.mockResolvedValue(privateSettings);
    // The public API projection intentionally has no credential, even when auth is disabled.
    mocks.getSettingsWithPantry.mockResolvedValue({
      settings: { ...settings, aiAuthConfigured: Boolean(aiApiKey) },
      pantryStaples: [],
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "completion-1",
      object: "chat.completion",
      created: 1,
      model: settings.aiModel,
      choices: [{
        index: 0,
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: JSON.stringify({ items: [{
            category: "Dry Goods",
            name: "Rice",
            quantityText: "1 cup",
            sourceRecipeIds: [recipe.id],
          }] }),
        },
      }],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateShoppingList(plan.id);

    expect(result).toEqual({ id: "shopping-list-1" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://shopping-provider.example/v1/chat/completions");
    expect(new Headers(init.headers).get("authorization")).toBe(authorization);
    expect(JSON.parse(String(init.body))).toMatchObject({ model: settings.aiModel });
    expect(mocks.replaceShoppingList).toHaveBeenCalledWith(plan.id, settings.aiModel, [expect.objectContaining({
      name: "Rice",
      quantityText: "1 cup",
      sourceRecipeIds: JSON.stringify([recipe.id]),
      normalizedName: "rice",
    })]);
  });
});
