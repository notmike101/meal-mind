import { describe, expect, it } from "vitest";
import { settingsUpdateRequestSchema, updateSkippedDayRequestSchema } from "./schemas";

describe("settingsUpdateRequestSchema", () => {
  it("accepts a boolean automatic planning preference", () => {
    expect(settingsUpdateRequestSchema.parse({ autoGenerateNextWeek: false })).toEqual({
      autoGenerateNextWeek: false,
    });
    expect(() => settingsUpdateRequestSchema.parse({ autoGenerateNextWeek: "false" })).toThrow();
  });
});

describe("updateSkippedDayRequestSchema", () => {
  it("requires an ISO date and explicit boolean state", () => {
    expect(updateSkippedDayRequestSchema.parse({ date: "2026-07-08", skipped: true })).toEqual({
      date: "2026-07-08",
      skipped: true,
    });
    expect(() => updateSkippedDayRequestSchema.parse({ date: "07/08/2026", skipped: true })).toThrow();
    expect(() => updateSkippedDayRequestSchema.parse({ date: "2026-07-08", skipped: "true" })).toThrow();
  });
});
