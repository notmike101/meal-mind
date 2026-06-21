import { describe, expect, it } from "vitest";
import { shoppingListDraftSchema, slotSwapSchema, weeklyPlanDraftSchema } from "./schemas";
import { addDays } from "@mealmind/domain";

describe("AI schemas", () => {
  it("accepts a complete weekly plan response", () => {
    const slots = Array.from({ length: 7 }, (_, day) => addDays("2026-06-22", day)).flatMap(
      (date) => [
        { date, mealType: "lunch", recipeId: "recipe-a", reason: "Fits lunch." },
        { date, mealType: "dinner", recipeId: "recipe-b", reason: "Fits dinner." },
      ],
    );

    expect(weeklyPlanDraftSchema.parse({ slots }).slots).toHaveLength(14);
  });

  it("accepts swap responses", () => {
    expect(slotSwapSchema.parse({ recipeId: "lentil-soup", reason: "More variety." })).toEqual({
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
