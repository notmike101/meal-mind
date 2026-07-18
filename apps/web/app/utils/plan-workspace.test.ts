import { describe, expect, it } from "vitest";
import { normalizeWeekStart } from "./dates";
import { resolveWorkspaceView, selectDefaultWeek } from "./plan-workspace";

const currentWeek = { weekStart: "2026-07-13", weekEnd: "2026-07-19" };

describe("weekly workspace routing", () => {
  it("normalizes explicit dates to Monday and rejects invalid dates", () => {
    expect(normalizeWeekStart("2026-07-18")).toBe("2026-07-13");
    expect(normalizeWeekStart("2026-02-31")).toBeNull();
  });

  it("keeps an explicit empty week separate from default fallback selection", () => {
    expect(normalizeWeekStart("2026-08-03")).toBe("2026-08-03");
    expect(selectDefaultWeek(currentWeek, [])).toBe(currentWeek.weekStart);
  });

  it("uses the nearest saved plan and prefers a future week on a tie", () => {
    const summary = (weekStart: string) => ({
      id: weekStart,
      weekStart,
      weekEnd: weekStart,
      status: "draft" as const,
      creationSource: "manual" as const,
      commitSource: null,
      committedAt: null,
      createdAt: `${weekStart}T12:00:00.000Z`,
      mealCount: 0,
    });
    expect(selectDefaultWeek(currentWeek, [summary("2026-07-06"), summary("2026-07-20")])).toBe("2026-07-20");
  });

  it("defaults unknown workspace views to plan", () => {
    expect(resolveWorkspaceView("shopping")).toBe("shopping");
    expect(resolveWorkspaceView("dashboard")).toBe("plan");
  });
});
