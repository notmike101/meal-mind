import type {
  ApiResponse,
  CurrentShoppingDto,
  PlanningStateDto,
  RecipeDto,
  RecipeListDto,
  SettingsWithPantryDto,
  ShoppingListDto,
} from "@helloqwen/contracts";

const INTERNAL_API_BASE_URL = process.env.HELLOQWEN_API_BASE_URL ?? "http://127.0.0.1:3101";

async function readApi<T>(path: string): Promise<T> {
  const response = await fetch(`${INTERNAL_API_BASE_URL}${path}`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!payload.ok) {
    throw new Error(payload.error.message);
  }
  return payload.data;
}

export function getSettingsWithPantry() {
  return readApi<SettingsWithPantryDto>("/api/settings");
}

export function getPlanningState() {
  return readApi<PlanningStateDto>("/api/plans/current");
}

export function getRecipes() {
  return readApi<RecipeListDto>("/api/recipes");
}

export function getRecipe(recipeId: string) {
  return readApi<RecipeDto>(`/api/recipes/${encodeURIComponent(recipeId)}`);
}

export function getShoppingList(planId: string) {
  return readApi<ShoppingListDto | null>(`/api/plans/${encodeURIComponent(planId)}/shopping-list`);
}

export async function getCurrentShopping(): Promise<CurrentShoppingDto> {
  const state = await getPlanningState();
  const plan = state.activePlan ?? state.nextDraft;
  return {
    plan: plan
      ? {
          id: plan.id,
          weekStart: plan.weekStart,
          weekEnd: plan.weekEnd,
          status: plan.status,
        }
      : null,
    shoppingList: plan ? await getShoppingList(plan.id) : null,
  };
}
