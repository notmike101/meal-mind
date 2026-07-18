import type { RecipeDto, RecipeImportJobDto, RecipeListDto } from "@mealmind/contracts";
import { defineStore } from "pinia";
import { apiRequest } from "~/composables/use-api";

export const useRecipesStore = defineStore("recipes", {
  state: () => ({
    catalog: null as RecipeListDto | null,
    details: {} as Record<string, RecipeDto>,
    imports: [] as RecipeImportJobDto[],
  }),
  actions: {
    async fetchCatalog() {
      this.catalog = await apiRequest<RecipeListDto>("/api/recipes");
    },
    async fetchRecipe(recipeId: string, servings?: number) {
      const query = servings === undefined ? "" : `?servings=${encodeURIComponent(servings)}`;
      const recipe = await apiRequest<RecipeDto>(`/api/recipes/${encodeURIComponent(recipeId)}${query}`);
      this.details[recipeId] = recipe;
      return recipe;
    },
    async startRecipeImport(url: string) {
      return apiRequest<RecipeImportJobDto>("/api/recipes/imports", {
        method: "POST",
        body: { url },
      });
    },
    async fetchRecipeImport(jobId: string) {
      return apiRequest<RecipeImportJobDto>(`/api/recipes/imports/${encodeURIComponent(jobId)}`);
    },
    async fetchRecentImports(limit = 10) {
      this.imports = await apiRequest<RecipeImportJobDto[]>(`/api/recipes/imports?limit=${encodeURIComponent(limit)}`);
      return this.imports;
    },
  },
});
