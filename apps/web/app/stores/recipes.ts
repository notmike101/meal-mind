import type { RecipeDto, RecipeListDto } from "@mealmind/contracts";
import { defineStore } from "pinia";
import { apiRequest } from "~/composables/use-api";

export const useRecipesStore = defineStore("recipes", {
  state: () => ({
    catalog: null as RecipeListDto | null,
    details: {} as Record<string, RecipeDto>,
  }),
  actions: {
    async fetchCatalog() {
      this.catalog = await apiRequest<RecipeListDto>("/api/recipes");
    },
    async fetchRecipe(recipeId: string) {
      const recipe = await apiRequest<RecipeDto>(`/api/recipes/${encodeURIComponent(recipeId)}`);
      this.details[recipeId] = recipe;
      return recipe;
    },
  },
});
