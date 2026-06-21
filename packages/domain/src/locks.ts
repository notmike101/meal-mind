import type { MealPlanDto as MealPlan } from "@mealmind/contracts";
import { formatDateInTimeZone } from "./weeks.js";

export function isPlanLocked(plan: Pick<MealPlan, "status">) {
  return plan.status === "committed" || plan.status === "active" || plan.status === "completed";
}

export function shouldAutoLockPlan(
  plan: Pick<MealPlan, "status" | "weekStart">,
  now: Date,
  timezone: string,
) {
  if (plan.status !== "draft") {
    return false;
  }

  const today = formatDateInTimeZone(now, timezone);
  return today >= plan.weekStart;
}

export function getLockedMutationMessage(plan: Pick<MealPlan, "status">) {
  if (!isPlanLocked(plan)) {
    return null;
  }

  return "This meal plan is locked. Recipe and serving changes are no longer allowed.";
}
