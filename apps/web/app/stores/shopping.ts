import type { CurrentShoppingDto, ShoppingItemDto, ShoppingListDto } from "@mealmind/contracts";
import { defineStore } from "pinia";
import { apiRequest } from "~/composables/use-api";
import { usePlanningStore } from "~/stores/planning";

export const useShoppingStore = defineStore("shopping", {
  state: () => ({
    plan: null as CurrentShoppingDto["plan"],
    shoppingList: null as ShoppingListDto | null,
  }),
  actions: {
    async fetchCurrent() {
      const planning = usePlanningStore();
      await planning.fetchState();
      const selected = planning.activePlan ?? planning.nextDraft;
      this.plan = selected
        ? { id: selected.id, weekStart: selected.weekStart, weekEnd: selected.weekEnd, status: selected.status }
        : null;
      this.shoppingList = selected
        ? await apiRequest<ShoppingListDto | null>(`/api/plans/${encodeURIComponent(selected.id)}/shopping-list`)
        : null;
    },
    async updateItem(itemId: string, checked: boolean) {
      const updated = await apiRequest<ShoppingItemDto>(`/api/shopping/items/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        body: { checked },
      });
      const item = this.shoppingList?.items.find((candidate) => candidate.id === itemId);
      if (item) Object.assign(item, updated);
    },
    async regenerate() {
      if (!this.plan) return;
      this.shoppingList = await apiRequest<ShoppingListDto>(
        `/api/plans/${encodeURIComponent(this.plan.id)}/shopping-list`,
        { method: "POST" },
      );
    },
  },
});
