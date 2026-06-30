import { describe, expect, it } from "vitest";
import { settingsUpdateRequestSchema } from "./schemas";

describe("settingsUpdateRequestSchema", () => {
  it("accepts a boolean automatic planning preference", () => {
    expect(settingsUpdateRequestSchema.parse({ autoGenerateNextWeek: false })).toEqual({
      autoGenerateNextWeek: false,
    });
    expect(() => settingsUpdateRequestSchema.parse({ autoGenerateNextWeek: "false" })).toThrow();
  });
});
