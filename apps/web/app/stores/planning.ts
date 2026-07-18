import type {
  CreateMealRequest,
  MealPlanDto,
  MealPlanSummaryDto,
  PlanningStateDto,
  UpdateMealRequest,
} from "@mealmind/contracts";
import { defineStore } from "pinia";
import { apiRequest } from "~/composables/use-api";

export const usePlanningStore = defineStore("planning", {
  state: () => ({
    planningState: null as PlanningStateDto | null,
    planSummaries: [] as MealPlanSummaryDto[],
    selectedWeekStart: null as string | null,
    selectedPlan: null as MealPlanDto | null,
    selectionLoading: false,
    selectionError: null as string | null,
    selectionRequestId: 0,
  }),
  getters: {
    activePlan: (state) => state.planningState?.activePlan ?? null,
    nextDraft: (state) => state.planningState?.nextDraft ?? null,
    currentWeek: (state) => state.planningState?.currentWeek ?? null,
    nextWeek: (state) => state.planningState?.nextWeek ?? null,
  },
  actions: {
    async fetchState() {
      this.planningState = await apiRequest<PlanningStateDto>("/api/plans/current");
    },
    async fetchPlanSummaries() {
      this.planSummaries = await apiRequest<MealPlanSummaryDto[]>("/api/plans");
    },
    async fetchWeek(weekStart: string) {
      this.selectedWeekStart = weekStart;
      await this.fetchSelectedWeek(weekStart);
    },
    async fetchSelectedWeek(weekStart: string) {
      const requestId = ++this.selectionRequestId;
      this.selectionLoading = true;
      this.selectionError = null;
      try {
        const plan = await apiRequest<MealPlanDto | null>(`/api/plans/by-week/${encodeURIComponent(weekStart)}`);
        if (requestId === this.selectionRequestId && this.selectedWeekStart === weekStart) {
          this.selectedPlan = plan;
        }
      } catch (error) {
        if (requestId === this.selectionRequestId && this.selectedWeekStart === weekStart) {
          this.selectedPlan = null;
          this.selectionError = error instanceof Error ? error.message : "Could not load this week.";
        }
        throw error;
      } finally {
        if (requestId === this.selectionRequestId) this.selectionLoading = false;
      }
    },
    async refreshAfterMutation(weekStart?: string | null) {
      const targetWeek = weekStart === undefined ? this.selectedWeekStart : weekStart;
      await Promise.all([this.fetchState(), this.fetchPlanSummaries()]);
      if (targetWeek && this.selectedWeekStart === targetWeek) await this.fetchSelectedWeek(targetWeek);
    },
    async generate(weekStart: string, replaceExisting: boolean, mealCount?: number) {
      await apiRequest("/api/plans/generate", {
        method: "POST",
        body: { weekStart, replaceExisting, mealCount },
      });
      await this.refreshAfterMutation(weekStart);
    },
    async createBlank(weekStart: string) {
      await apiRequest("/api/plans", { method: "POST", body: { weekStart } });
      await this.refreshAfterMutation(weekStart);
    },
    async commit(planId: string) {
      const weekStart = this.selectedPlan?.id === planId ? this.selectedPlan.weekStart : this.selectedWeekStart;
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/commit`, { method: "POST" });
      await this.refreshAfterMutation(weekStart);
    },
    async addMeal(planId: string, meal: CreateMealRequest) {
      const weekStart = this.selectedPlan?.id === planId ? this.selectedPlan.weekStart : this.selectedWeekStart;
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/meals`, {
        method: "POST",
        body: meal,
      });
      await this.refreshAfterMutation(weekStart);
    },
    async updateMeal(planId: string, mealId: string, updates: UpdateMealRequest) {
      const weekStart = this.selectedPlan?.id === planId ? this.selectedPlan.weekStart : this.selectedWeekStart;
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/meals/${encodeURIComponent(mealId)}`, {
        method: "PATCH",
        body: updates,
      });
      await this.refreshAfterMutation(weekStart);
    },
    async removeMeal(planId: string, mealId: string) {
      const weekStart = this.selectedPlan?.id === planId ? this.selectedPlan.weekStart : this.selectedWeekStart;
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/meals/${encodeURIComponent(mealId)}`, { method: "DELETE" });
      await this.refreshAfterMutation(weekStart);
    },
    async setDaySkipped(planId: string, date: string, skipped: boolean) {
      const weekStart = this.selectedPlan?.id === planId ? this.selectedPlan.weekStart : this.selectedWeekStart;
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/skipped-days`, {
        method: "PATCH",
        body: { date, skipped },
      });
      await this.refreshAfterMutation(weekStart);
    },
    async swap(planId: string, mealId: string, mode: "manual" | "ai", recipeId?: string) {
      const weekStart = this.selectedPlan?.id === planId ? this.selectedPlan.weekStart : this.selectedWeekStart;
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/meals/${encodeURIComponent(mealId)}/swap`, {
        method: "POST",
        body: { mode, recipeId: mode === "manual" ? recipeId : undefined },
      });
      await this.refreshAfterMutation(weekStart);
    },
    async updateAdherence(mealId: string, status: "done" | "skipped") {
      const weekStart = this.selectedPlan?.weekStart ?? this.selectedWeekStart;
      await apiRequest("/api/adherence", { method: "PATCH", body: { mealId, status } });
      await this.refreshAfterMutation(weekStart);
    },
  },
});
