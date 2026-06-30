import { describe, expect, it } from "vitest";
import { mealSwapSchema, shoppingListDraftSchema, weeklyPlanDraftSchema } from "./schemas";

describe("AI schemas", () => {
  it("accepts arbitrary meal counts and optional slots", () => {
    const meals = [
      { date: "2026-06-22", slot: null, recipeId: "recipe-a", reason: "Flexible meal." },
      { date: "2026-06-22", slot: "Post-workout", recipeId: "recipe-b", reason: "Extra meal." },
      { date: "2026-06-22", slot: "Post-workout", recipeId: "recipe-a", reason: "Duplicates are valid." },
    ];
    expect(weeklyPlanDraftSchema.parse({ meals }).meals).toHaveLength(3);
  });

  it("accepts swap responses", () => {
    expect(mealSwapSchema.parse({ recipeId: "lentil-soup", reason: "More variety." })).toEqual({
      recipeId: "lentil-soup",
      reason: "More variety.",
    });
  });

  it("rejects unknown shopping categories", () => {
    expect(() =>
      shoppingListDraftSchema.parse({
        items: [
          {
            category: "Random",
            name: "Rice",
            quantityText: "1 cup",
            sourceRecipeIds: ["chicken-rice-bowl"],
          },
        ],
      }),
    ).toThrow();
  });
});
