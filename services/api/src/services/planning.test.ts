import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPlanWithMeals: vi.fn(),
  generateShoppingList: vi.fn(),
  getPlanByWeekStart: vi.fn(),
  getPlanWithMeals: vi.fn(),
  getRecipeCatalog: vi.fn(),
  getSettings: vi.fn(),
  replacePlanWithMeals: vi.fn(),
  runJsonPrompt: vi.fn(),
  weeklyPlanMessages: vi.fn(),
}));

vi.mock("@mealmind/ai", async (importOriginal) => ({
  ...await importOriginal<typeof import("@mealmind/ai")>(),
  runJsonPrompt: mocks.runJsonPrompt,
  weeklyPlanMessages: mocks.weeklyPlanMessages,
}));

vi.mock("@mealmind/db/repositories/plans", async (importOriginal) => ({
  ...await importOriginal<typeof import("@mealmind/db/repositories/plans")>(),
  createPlanWithMeals: mocks.createPlanWithMeals,
  getPlanByWeekStart: mocks.getPlanByWeekStart,
  getPlanWithMeals: mocks.getPlanWithMeals,
  replacePlanWithMeals: mocks.replacePlanWithMeals,
}));

vi.mock("@mealmind/db/repositories/settings", async (importOriginal) => ({
  ...await importOriginal<typeof import("@mealmind/db/repositories/settings")>(),
  getSettings: mocks.getSettings,
}));

vi.mock("../recipes.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("../recipes.js")>(),
  getRecipeCatalog: mocks.getRecipeCatalog,
}));

vi.mock("./shopping.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("./shopping.js")>(),
  generateShoppingList: mocks.generateShoppingList,
}));

import { generateWeeklyPlan } from "./planning.js";

const settings = {
  id: 1,
  timezone: "America/Chicago",
  aiBaseUrl: "http://127.0.0.1:1234/v1",
  aiModel: "test-model",
  planningPreferences: "",
  planningVarietyRules: "",
  defaultMealServings: 2,
  defaultWeeklyMealCount: 1,
  autoGenerateNextWeek: true,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const recipe = {
  id: "recipe-1",
  title: "Fresh Recipe",
};

function mockValidDraft() {
  mocks.runJsonPrompt.mockResolvedValue({
    meals: [{
      date: "2026-07-20",
      slot: "Dinner",
      recipeId: recipe.id,
      reason: "A fresh choice.",
    }],
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-18T17:00:00.000Z"));
  mocks.getSettings.mockResolvedValue(settings);
  mocks.getRecipeCatalog.mockResolvedValue({ recipes: [recipe], invalidRecipes: [] });
  mocks.weeklyPlanMessages.mockReturnValue({ system: "system", user: "user" });
  mocks.generateShoppingList.mockResolvedValue({ id: "shopping-list" });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("generateWeeklyPlan", () => {
  it.each([
    ["current-week generation", "2026-07-13", false],
    ["current-week regeneration", "2026-07-13", true],
    ["past-week generation", "2026-07-06", false],
  ])("rejects %s before loading recipes or calling AI", async (_name, weekStart, replaceExisting) => {
    await expect(generateWeeklyPlan({ weekStart, replaceExisting })).rejects.toMatchObject({
      code: "CONFLICT",
      status: 409,
      message: "Meal plans can only be generated for future weeks.",
    });

    expect(mocks.getPlanByWeekStart).not.toHaveBeenCalled();
    expect(mocks.getRecipeCatalog).not.toHaveBeenCalled();
    expect(mocks.runJsonPrompt).not.toHaveBeenCalled();
  });

  it("replaces a future draft only after the generated plan validates", async () => {
    const existing = { id: "draft-old", weekStart: "2026-07-20", status: "draft" };
    mocks.getPlanByWeekStart.mockResolvedValue(existing);
    mockValidDraft();
    mocks.replacePlanWithMeals.mockImplementation(async (_existingPlanId, plan, meals) => ({ ...plan, meals }));
    mocks.getPlanWithMeals.mockImplementation(async (id) => ({ id, status: "draft", meals: [] }));

    const result = await generateWeeklyPlan({ weekStart: "2026-07-20", replaceExisting: true });

    expect(mocks.replacePlanWithMeals).toHaveBeenCalledWith(
      existing.id,
      expect.objectContaining({
        weekStart: "2026-07-20",
        weekEnd: "2026-07-26",
        status: "draft",
        creationSource: "ai",
        skippedDates: [],
      }),
      [expect.objectContaining({
        date: "2026-07-20",
        recipeId: recipe.id,
        servings: 2,
        status: "planned",
      })],
    );
    expect(mocks.generateShoppingList).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ status: "draft" });
  });

  it("preserves the existing draft when AI generation fails", async () => {
    mocks.getPlanByWeekStart.mockResolvedValue({ id: "draft-old", weekStart: "2026-07-20", status: "draft" });
    mocks.runJsonPrompt.mockRejectedValue(new Error("AI unavailable"));

    await expect(generateWeeklyPlan({ weekStart: "2026-07-20", replaceExisting: true }))
      .rejects.toThrow("AI unavailable");

    expect(mocks.replacePlanWithMeals).not.toHaveBeenCalled();
    expect(mocks.generateShoppingList).not.toHaveBeenCalled();
  });

  it("returns a conflict when the draft changes before the replacement transaction", async () => {
    mocks.getPlanByWeekStart.mockResolvedValue({ id: "draft-old", weekStart: "2026-07-20", status: "draft" });
    mockValidDraft();
    mocks.replacePlanWithMeals.mockResolvedValue(null);

    await expect(generateWeeklyPlan({ weekStart: "2026-07-20", replaceExisting: true })).rejects.toMatchObject({
      code: "CONFLICT",
      status: 409,
      message: "The draft changed while regeneration was running. Refresh and try again.",
    });

    expect(mocks.generateShoppingList).not.toHaveBeenCalled();
  });

  it("does not call AI when a future plan is already locked", async () => {
    mocks.getPlanByWeekStart.mockResolvedValue({ id: "committed", weekStart: "2026-07-20", status: "committed" });

    await expect(generateWeeklyPlan({ weekStart: "2026-07-20", replaceExisting: true })).rejects.toMatchObject({
      code: "CONFLICT",
      status: 409,
      message: "A locked plan cannot be replaced.",
    });

    expect(mocks.getRecipeCatalog).not.toHaveBeenCalled();
    expect(mocks.runJsonPrompt).not.toHaveBeenCalled();
  });
});
