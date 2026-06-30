import type { CreateMealRequest, PlanningStateDto, UpdateMealRequest } from "@mealmind/contracts";
import { defineStore } from "pinia";
import { apiRequest } from "~/composables/use-api";

export const usePlanningStore = defineStore("planning", {
  state: () => ({ planningState: null as PlanningStateDto | null }),
  getters: {
    activePlan: (state) => state.planningState?.activePlan ?? null,
    nextDraft: (state) => state.planningState?.nextDraft ?? null,
    nextWeek: (state) => state.planningState?.nextWeek ?? null,
    editablePlan(): PlanningStateDto["nextDraft"] {
      return this.nextDraft ?? this.activePlan;
    },
  },
  actions: {
    async fetchState() {
      this.planningState = await apiRequest<PlanningStateDto>("/api/plans/current");
    },
    async generate(replaceExisting: boolean, mealCount?: number) {
      await apiRequest("/api/plans/generate", {
        method: "POST",
        body: { replaceExisting, mealCount },
      });
      await this.fetchState();
    },
    async createBlank() {
      await apiRequest("/api/plans", { method: "POST", body: {} });
      await this.fetchState();
    },
    async commit(planId: string) {
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/commit`, { method: "POST" });
      await this.fetchState();
    },
    async addMeal(planId: string, meal: CreateMealRequest) {
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/meals`, {
        method: "POST",
        body: meal,
      });
      await this.fetchState();
    },
    async updateMeal(planId: string, mealId: string, updates: UpdateMealRequest) {
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/meals/${encodeURIComponent(mealId)}`, {
        method: "PATCH",
        body: updates,
      });
      await this.fetchState();
    },
    async removeMeal(planId: string, mealId: string) {
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/meals/${encodeURIComponent(mealId)}`, { method: "DELETE" });
      await this.fetchState();
    },
    async setDaySkipped(planId: string, date: string, skipped: boolean) {
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/skipped-days`, {
        method: "PATCH",
        body: { date, skipped },
      });
      await this.fetchState();
    },
    async swap(planId: string, mealId: string, mode: "manual" | "ai", recipeId?: string) {
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/meals/${encodeURIComponent(mealId)}/swap`, {
        method: "POST",
        body: { mode, recipeId: mode === "manual" ? recipeId : undefined },
      });
      await this.fetchState();
    },
    async updateAdherence(mealId: string, status: "done" | "skipped") {
      await apiRequest("/api/adherence", { method: "PATCH", body: { mealId, status } });
      await this.fetchState();
    },
  },
});
