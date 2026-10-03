import { describe, expect, it } from "vitest";
import { aiModelsRequestSchema, areAiBaseUrlsEqual, createMealRequestSchema, generatePlanRequestSchema, normalizeAiBaseUrl, settingsUpdateRequestSchema, updateMealRequestSchema } from "./schemas";

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

describe.each([
  ["settings updates", settingsUpdateRequestSchema],
  ["model discovery", aiModelsRequestSchema],
] as const)("%s provider credentials", (_name, schema) => {
  it.each([
    [{}, undefined],
    [{ aiApiKey: "  saved-key  " }, "saved-key"],
    [{ aiApiKey: "" }, null],
    [{ aiApiKey: " \t " }, null],
    [{ aiApiKey: null }, null],
  ] as const)("normalizes endpoint and key for %j", (credentials, expectedKey) => {
    const parsed = schema.parse({
      aiBaseUrl: "  https://provider.example/v1///  ",
      ...credentials,
    });

    expect(parsed.aiBaseUrl).toBe("https://provider.example/v1");
    expect(parsed.aiApiKey).toBe(expectedKey);
    if (!("aiApiKey" in credentials)) {
      expect(parsed).not.toHaveProperty("aiApiKey");
    }
  });

  it.each([
    "https://user:secret@provider.example/v1",
    "https://user@provider.example/v1",
    "https://@provider.example/v1",
    "https://provider.example/v1?api_key=secret",
    "https://provider.example/v1#secret",
    "file:///tmp/provider",
  ])("rejects unsafe provider URL %s", (aiBaseUrl) => {
    expect(schema.safeParse({ aiBaseUrl }).success).toBe(false);
  });

  it("rejects non-string credentials", () => {
    expect(schema.safeParse({ aiBaseUrl: "https://provider.example/v1", aiApiKey: 123 }).success).toBe(false);
  });
});

describe("areAiBaseUrlsEqual", () => {
  it("compares normalized endpoints without merging different paths or origins", () => {
    expect(areAiBaseUrlsEqual(" https://PROVIDER.example:443/v1/// ", "https://provider.example/v1")).toBe(true);
    expect(areAiBaseUrlsEqual("https://provider.example/v1", "https://provider.example/v2")).toBe(false);
    expect(areAiBaseUrlsEqual("https://provider.example/v1", "https://other.example/v1")).toBe(false);
  });

  it.each([
    "https://provider.example/v1?legacy=1",
    "https://provider.example/v1#legacy",
    "https://user:secret@provider.example/v1",
    "not a URL",
    "file:///tmp/provider",
  ])("treats invalid legacy endpoint %s as different while keeping new input strict", (legacy) => {
    const clean = "https://provider.example/v1";
    expect(areAiBaseUrlsEqual(legacy, clean)).toBe(false);
    expect(areAiBaseUrlsEqual(clean, legacy)).toBe(false);
    expect(areAiBaseUrlsEqual(legacy, legacy)).toBe(false);
    expect(() => normalizeAiBaseUrl(legacy)).toThrow();
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
