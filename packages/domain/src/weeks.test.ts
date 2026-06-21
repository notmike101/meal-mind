import { describe, expect, it } from "vitest";
import { addDays, getCurrentWeekRange, getNextWeekRange, getWeekSlots } from "./weeks";

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

  it("builds fourteen lunch and dinner slots", () => {
    const slots = getWeekSlots("2026-06-22");

    expect(slots).toHaveLength(14);
    expect(slots[0]).toEqual({ date: "2026-06-22", mealType: "lunch" });
    expect(slots[13]).toEqual({ date: "2026-06-28", mealType: "dinner" });
    expect(addDays("2026-06-22", 6)).toBe("2026-06-28");
  });
});
