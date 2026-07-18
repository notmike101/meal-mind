import type { MealPlanSummaryDto, WeekRangeDto } from "@mealmind/contracts";

export type WorkspaceView = "plan" | "shopping";

export function resolveWorkspaceView(value: unknown): WorkspaceView {
  return value === "shopping" ? "shopping" : "plan";
}

export function selectDefaultWeek(currentWeek: WeekRangeDto, summaries: MealPlanSummaryDto[]) {
  if (summaries.some((plan) => plan.weekStart === currentWeek.weekStart)) return currentWeek.weekStart;
  const current = new Date(`${currentWeek.weekStart}T12:00:00Z`).valueOf();
  const nearest = [...summaries].sort((left, right) => {
    const leftDistance = Math.abs(new Date(`${left.weekStart}T12:00:00Z`).valueOf() - current);
    const rightDistance = Math.abs(new Date(`${right.weekStart}T12:00:00Z`).valueOf() - current);
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    return right.weekStart.localeCompare(left.weekStart);
  })[0];
  return nearest?.weekStart ?? currentWeek.weekStart;
}

export function workspaceLocation(week: string, view: WorkspaceView) {
  return { path: "/plan", query: { week, view } };
}
