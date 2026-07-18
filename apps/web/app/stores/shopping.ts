import type { CurrentShoppingDto, ShoppingItemDto, ShoppingListDto } from "@mealmind/contracts";
import { defineStore } from "pinia";
import { apiRequest } from "~/composables/use-api";

type ShoppingPlan = NonNullable<CurrentShoppingDto["plan"]>;

export const useShoppingStore = defineStore("shopping", {
  state: () => ({
    plan: null as ShoppingPlan | null,
    shoppingList: null as ShoppingListDto | null,
    loading: false,
    error: null as string | null,
    requestId: 0,
  }),
  actions: {
    async fetchForPlan(plan: ShoppingPlan | null) {
      const requestId = ++this.requestId;
      this.plan = plan;
      this.shoppingList = null;
      this.error = null;
      if (!plan) {
        this.loading = false;
        return;
      }
      this.loading = true;
      try {
        const list = await apiRequest<ShoppingListDto | null>(
          `/api/plans/${encodeURIComponent(plan.id)}/shopping-list`,
        );
        if (requestId === this.requestId && this.plan?.id === plan.id) this.shoppingList = list;
      } catch (error) {
        if (requestId === this.requestId && this.plan?.id === plan.id) {
          this.error = error instanceof Error ? error.message : "Could not load this shopping list.";
        }
        throw error;
      } finally {
        if (requestId === this.requestId) this.loading = false;
      }
    },
    async updateItem(itemId: string, checked: boolean) {
      const updated = await apiRequest<ShoppingItemDto>(`/api/shopping/items/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        body: { checked },
      });
      const item = this.shoppingList?.items.find((candidate) => candidate.id === itemId);
      if (item) Object.assign(item, updated);
    },
    async generate() {
      if (!this.plan) return;
      this.shoppingList = await apiRequest<ShoppingListDto>(
        `/api/plans/${encodeURIComponent(this.plan.id)}/shopping-list`,
        { method: "POST" },
      );
    },
    async regenerate() {
      await this.generate();
    },
  },
});
