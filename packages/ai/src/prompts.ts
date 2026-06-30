import type { SettingsDto as Settings } from "@mealmind/contracts";
import type { Recipe, WeekRange } from "@mealmind/domain";

export function buildRecipeCatalog(recipes: Recipe[]) {
  return recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    defaultServings: recipe.defaultServings,
    suggestedSlots: recipe.suggestedSlots,
    tags: recipe.tags,
    prepTimeMinutes: recipe.prepTimeMinutes ?? null,
    cookTimeMinutes: recipe.cookTimeMinutes ?? null,
  }));
}

export function weeklyPlanMessages(input: {
  settings: Settings;
  week: WeekRange;
  recipes: Recipe[];
  mealCount: number;
  validationErrors?: string[];
}) {
  const system = [
    "You are MealMind, a local meal-planning assistant.",
    "Return strict JSON only. Do not use Markdown.",
    "You must choose only recipe IDs from the provided recipeCatalog.",
    `Plan exactly ${input.mealCount} meals across the requested week.`,
    "A meal slot label is optional. Use a concise label when useful, or null when no label is needed.",
  ].join(" ");

  const user = {
    task: "Create a weekly meal plan.",
    week: input.week,
    requiredResponseShape: {
      meals: [
        {
          date: "YYYY-MM-DD",
          slot: "optional label such as Breakfast, Lunch, Dinner, Snack, or null",
          recipeId: "one id from recipeCatalog",
          reason: "short reason",
        },
      ],
    },
    preferences: input.settings.planningPreferences,
    varietyRules: input.settings.planningVarietyRules,
    recipeCatalog: buildRecipeCatalog(input.recipes),
    validationErrorsFromPriorAttempt: input.validationErrors ?? [],
  };

  return { system, user: JSON.stringify(user, null, 2) };
}

export function mealSwapMessages(input: {
  settings: Settings;
  recipes: Recipe[];
  date: string;
  slot: string | null;
  currentRecipeId: string;
  note?: string;
  validationErrors?: string[];
}) {
  const system = [
    "You are MealMind, a local meal-planning assistant.",
    "Return strict JSON only. Do not use Markdown.",
    "Choose exactly one replacement recipe ID from recipeCatalog.",
  ].join(" ");

  const user = {
    task: "Swap one planned meal.",
    date: input.date,
    slot: input.slot,
    currentRecipeId: input.currentRecipeId,
    userNote: input.note ?? "",
    preferences: input.settings.planningPreferences,
    varietyRules: input.settings.planningVarietyRules,
    requiredResponseShape: {
      recipeId: "one id from recipeCatalog",
      reason: "short reason",
    },
    recipeCatalog: buildRecipeCatalog(
       input.recipes.filter((recipe) => recipe.id !== input.currentRecipeId),
     ),
    validationErrorsFromPriorAttempt: input.validationErrors ?? [],
  };

  return { system, user: JSON.stringify(user, null, 2) };
}

export function shoppingListMessages(input: {
  settings: Settings;
  pantryStaples: string[];
  mealIngredients: Array<{
    recipeId: string;
    recipeTitle: string;
    mealServings: number;
    defaultServings: number;
    ingredients: string[];
  }>;
  validationErrors?: string[];
}) {
  const system = [
    "You are MealMind, a grocery-list consolidation assistant.",
    "Return strict JSON only. Do not use Markdown.",
    "Combine similar ingredients, preserve quantities as readable text, and categorize items.",
    "Do not include pantry staples.",
  ].join(" ");

  const user = {
    task: "Create a consolidated shopping list for this meal plan.",
    pantryStaples: input.pantryStaples,
    allowedCategories: [
      "Produce",
      "Meat & Seafood",
      "Dairy & Eggs",
      "Bakery",
      "Dry Goods",
      "Canned & Jarred",
      "Frozen",
      "Spices & Condiments",
      "Other",
    ],
    requiredResponseShape: {
      items: [
        {
          category: "one allowed category",
          name: "ingredient name",
          quantityText: "combined readable quantity",
          sourceRecipeIds: ["recipe-id"],
        },
      ],
    },
    mealIngredients: input.mealIngredients,
    validationErrorsFromPriorAttempt: input.validationErrors ?? [],
  };

  return { system, user: JSON.stringify(user, null, 2) };
}
