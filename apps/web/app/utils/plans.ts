import type { MealPlanDto } from "@mealmind/contracts";

export function isPlanLocked(plan: Pick<MealPlanDto, "status">) {
  return plan.status === "committed" || plan.status === "active" || plan.status === "completed";
}
