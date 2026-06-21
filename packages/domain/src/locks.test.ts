import { describe, expect, it } from "vitest";
import { isPlanLocked, shouldAutoLockPlan } from "./locks";

describe("lock utilities", () => {
  it("locks committed and active plans", () => {
    expect(isPlanLocked({ status: "draft" })).toBe(false);
    expect(isPlanLocked({ status: "committed" })).toBe(true);
    expect(isPlanLocked({ status: "active" })).toBe(true);
  });

  it("auto-locks draft plans on or after week start", () => {
    expect(
      shouldAutoLockPlan(
        { status: "draft", weekStart: "2026-06-22" },
        new Date("2026-06-22T01:00:00-05:00"),
        "America/Chicago",
      ),
    ).toBe(true);
    expect(
      shouldAutoLockPlan(
        { status: "draft", weekStart: "2026-06-22" },
        new Date("2026-06-21T23:00:00-05:00"),
        "America/Chicago",
      ),
    ).toBe(false);
  });
});
