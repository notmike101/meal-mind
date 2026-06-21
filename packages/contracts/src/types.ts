export type MealType = "lunch" | "dinner";
export type MealPlanStatus = "draft" | "committed" | "active" | "completed";
export type MealSlotStatus = "planned" | "done" | "skipped" | "moved";

export type SettingsDto = {
  id: number;
  timezone: string;
  aiBaseUrl: string;
  aiModel: string;
  planningPreferences: string;
  planningVarietyRules: string;
  defaultLunchServings: number;
  defaultDinnerServings: number;
  createdAt: string;
  updatedAt: string;
};

export type PantryStapleDto = {
  id: number;
  name: string;
  normalizedName: string;
};

export type MealSlotDto = {
  id: string;
  planId: string;
  date: string;
  mealType: MealType;
  recipeId: string;
  recipeTitleSnapshot: string;
  servings: number;
  status: MealSlotStatus;
  swapCount: number;
  notes: string;
};

export type MealPlanDto = {
  id: string;
  weekStart: string;
  weekEnd: string;
  status: MealPlanStatus;
  commitSource: "manual" | "auto" | null;
  committedAt: string | null;
  generatedAt: string;
  aiModel: string;
  aiBaseUrl: string;
  aiPromptHash: string;
  slots: MealSlotDto[];
};

export type WeekRangeDto = {
  weekStart: string;
  weekEnd: string;
};

export type PlanningStateDto = {
  activePlan: MealPlanDto | null;
  nextDraft: MealPlanDto | null;
  nextWeek: WeekRangeDto;
};

export type InvalidRecipeDto = {
  filePath: string;
  errors: string[];
};

export type RecipeDto = {
  id: string;
  title: string;
  description: string;
  defaultServings: number;
  mealTypes: MealType[];
  tags: string[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  filePath: string;
  ingredients: string[];
  instructions: string;
};

export type RecipeSummaryDto = Omit<RecipeDto, "ingredients" | "instructions"> & {
  totalTimeMinutes: number;
  ingredientCount: number;
  detailResource: string;
  appUrl: string;
};

export type RecipeListDto = {
  recipes: RecipeSummaryDto[];
  invalidRecipes: InvalidRecipeDto[];
  count: number;
};

export type ShoppingItemDto = {
  id: string;
  shoppingListId: string;
  category: string;
  name: string;
  quantityText: string;
  normalizedName: string;
  checked: boolean;
  sourceRecipeIds: string;
  sortOrder: number;
};

export type ShoppingListDto = {
  id: string;
  planId: string;
  createdAt: string;
  updatedAt: string;
  aiModel: string;
  items: ShoppingItemDto[];
};

export type SettingsWithPantryDto = {
  settings: SettingsDto;
  pantryStaples: PantryStapleDto[];
};

export type CurrentShoppingDto = {
  plan: Pick<MealPlanDto, "id" | "weekStart" | "weekEnd" | "status"> | null;
  shoppingList: ShoppingListDto | null;
};

export type AppSummaryDto = {
  settings: SettingsDto;
  pantryStaples: PantryStapleDto[];
  recipeCount: number;
  invalidRecipeCount: number;
  planningState: PlanningStateDto;
};
