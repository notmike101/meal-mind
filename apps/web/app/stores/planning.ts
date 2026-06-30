import type { PlanningStateDto } from "@mealmind/contracts";
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
    async generate(replaceExisting: boolean) {
      await apiRequest("/api/plans/generate", {
        method: "POST",
        body: { replaceExisting },
      });
      await this.fetchState();
    },
    async commit(planId: string) {
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/commit`, { method: "POST" });
      await this.fetchState();
    },
    async updateServings(planId: string, slotId: string, servings: number) {
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/slots/${encodeURIComponent(slotId)}`, {
        method: "PATCH",
        body: { servings },
      });
      await this.fetchState();
    },
    async setDaySkipped(planId: string, date: string, skipped: boolean) {
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/skipped-days`, {
        method: "PATCH",
        body: { date, skipped },
      });
      await this.fetchState();
    },
    async swap(planId: string, slotId: string, mode: "manual" | "ai", recipeId?: string) {
      await apiRequest(`/api/plans/${encodeURIComponent(planId)}/swap`, {
        method: "POST",
        body: { slotId, mode, recipeId: mode === "manual" ? recipeId : undefined },
      });
      await this.fetchState();
    },
    async updateAdherence(slotId: string, status: "done" | "skipped") {
      await apiRequest("/api/adherence", { method: "PATCH", body: { slotId, status } });
      await this.fetchState();
    },
  },
});
