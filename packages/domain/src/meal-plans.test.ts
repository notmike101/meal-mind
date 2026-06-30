import { describe, expect, it } from "vitest";
import { normalizeMealSlot, sortMeals, validatePlannedMealsForWeek } from "./meal-plans";

describe("flexible meal plans", () => {
  it("allows repeated dates and slot labels while enforcing the requested count", () => {
    const meals = [
      { date: "2026-06-22", slot: null, recipeId: "a" },
      { date: "2026-06-22", slot: "Snack", recipeId: "b" },
      { date: "2026-06-22", slot: "Snack", recipeId: "c" },
    ];
    expect(validatePlannedMealsForWeek(meals, { weekStart: "2026-06-22", weekEnd: "2026-06-28" }, 3)).toEqual([]);
    expect(validatePlannedMealsForWeek(meals, { weekStart: "2026-06-22", weekEnd: "2026-06-28" }, 2)).toContain("Expected exactly 2 meals but received 3.");
  });

  it("normalizes empty slot labels and sorts by date and persisted order", () => {
    expect(normalizeMealSlot("  ")).toBeNull();
    expect(normalizeMealSlot("  Post-workout ")).toBe("Post-workout");
    const base = { planId: "p", recipeId: "r", recipeTitleSnapshot: "R", servings: 1, status: "planned" as const, swapCount: 0, notes: "", slot: null };
    const meals = [
      { ...base, id: "b", date: "2026-06-23", sortOrder: 0 },
      { ...base, id: "a", date: "2026-06-22", sortOrder: 1 },
      { ...base, id: "c", date: "2026-06-22", sortOrder: 0 },
    ];
    expect(sortMeals(meals).map((meal) => meal.id)).toEqual(["c", "a", "b"]);
  });
});
