import { describe, expect, it } from "vitest";
import { addDays, getCurrentWeekRange, getNextWeekRange } from "./weeks";

describe("week utilities", () => {
  it("computes Monday-Sunday ranges", () => {
    const range = getCurrentWeekRange(new Date("2026-06-20T18:00:00-05:00"), "America/Chicago");

    expect(range).toEqual({
      weekStart: "2026-06-15",
      weekEnd: "2026-06-21",
    });
  });

  it("computes the following week", () => {
    const range = getNextWeekRange(new Date("2026-06-20T18:00:00-05:00"), "America/Chicago");

    expect(range).toEqual({
      weekStart: "2026-06-22",
      weekEnd: "2026-06-28",
    });
  });

  it("adds days within a weekly range", () => {
    expect(addDays("2026-06-22", 6)).toBe("2026-06-28");
  });
});
