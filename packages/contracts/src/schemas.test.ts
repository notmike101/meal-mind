import { describe, expect, it } from "vitest";
import { createMealRequestSchema, generatePlanRequestSchema, settingsUpdateRequestSchema, updateMealRequestSchema } from "./schemas";

describe("settingsUpdateRequestSchema", () => {
  it("accepts a boolean automatic planning preference", () => {
    expect(settingsUpdateRequestSchema.parse({ autoGenerateNextWeek: false })).toEqual({
      autoGenerateNextWeek: false,
    });
    expect(() => settingsUpdateRequestSchema.parse({ autoGenerateNextWeek: "false" })).toThrow();
  });
});

describe("flexible meal request schemas", () => {
  it("accepts any positive safe generation count", () => {
    expect(generatePlanRequestSchema.parse({ mealCount: 250_000 }).mealCount).toBe(250_000);
    expect(() => generatePlanRequestSchema.parse({ mealCount: 0 })).toThrow();
  });

  it("normalizes optional slot labels", () => {
    expect(createMealRequestSchema.parse({ date: "2026-07-06", recipeId: "recipe-a", slot: "  Snack  " }).slot).toBe("Snack");
    expect(updateMealRequestSchema.parse({ slot: "  " }).slot).toBeNull();
  });
});
