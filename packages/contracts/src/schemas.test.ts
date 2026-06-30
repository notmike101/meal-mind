import { describe, expect, it } from "vitest";
import { aiModelsRequestSchema, createMealRequestSchema, generatePlanRequestSchema, settingsUpdateRequestSchema, updateMealRequestSchema } from "./schemas";

describe("settingsUpdateRequestSchema", () => {
  it("accepts a boolean automatic planning preference", () => {
    expect(settingsUpdateRequestSchema.parse({ autoGenerateNextWeek: false })).toEqual({
      autoGenerateNextWeek: false,
    });
    expect(() => settingsUpdateRequestSchema.parse({ autoGenerateNextWeek: "false" })).toThrow();
  });

  it("validates provider endpoint and model settings", () => {
    expect(settingsUpdateRequestSchema.parse({ aiBaseUrl: "https://provider.example/v1", aiModel: " model-a " }))
      .toEqual({ aiBaseUrl: "https://provider.example/v1", aiModel: "model-a" });
    expect(() => settingsUpdateRequestSchema.parse({ aiBaseUrl: "file:///tmp/provider", aiModel: "" })).toThrow();
  });
});

describe("aiModelsRequestSchema", () => {
  it("requires an HTTP-compatible provider URL", () => {
    expect(aiModelsRequestSchema.parse({ aiBaseUrl: "http://127.0.0.1:1234/v1" }))
      .toEqual({ aiBaseUrl: "http://127.0.0.1:1234/v1" });
    expect(() => aiModelsRequestSchema.parse({ aiBaseUrl: "provider.example/v1" })).toThrow();
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
