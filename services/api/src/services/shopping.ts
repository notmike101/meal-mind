import { runJsonPrompt, shoppingListDraftSchema, shoppingListMessages, type ShoppingListDraft } from "@mealmind/ai";
import { AppError } from "@mealmind/contracts";
import { buildMealIngredients, isPlanLocked, normalizeShoppingItemName } from "@mealmind/domain";
import { createAiEvent } from "@mealmind/db/repositories/ai-events";
import { getPlanWithMeals } from "@mealmind/db/repositories/plans";
import { getSettingsWithPantry } from "@mealmind/db/repositories/settings";
import { deleteShoppingListForPlan, getShoppingListForPlan, replaceShoppingList } from "@mealmind/db/repositories/shopping";
import { getAvailableRecipes } from "../recipes.js";

function validateShoppingListAgainstRecipes(draft: ShoppingListDraft, recipeIds: Set<string>) {
  const errors: string[] = [];
  for (const item of draft.items) {
    for (const sourceRecipeId of item.sourceRecipeIds) {
      if (!recipeIds.has(sourceRecipeId)) {
        errors.push(`Shopping item "${item.name}" references unknown recipe "${sourceRecipeId}".`);
      }
    }
  }
  return errors;
}

export async function generateShoppingList(planId: string) {
  const plan = await getPlanWithMeals(planId);
  if (!plan) {
    throw new AppError("NOT_FOUND", "Meal plan not found.", 404);
  }

  const existingList = await getShoppingListForPlan(planId);
  if (existingList && isPlanLocked(plan)) {
    throw new AppError("CONFLICT", "An existing shopping list for a locked plan cannot be regenerated.", 409);
  }

  const { settings, pantryStaples } = await getSettingsWithPantry();
  const recipes = await getAvailableRecipes();
  const pantryNames = pantryStaples.map((staple) => staple.name);
  const mealIngredients = buildMealIngredients({
    meals: plan.meals.filter((meal) => !plan.skippedDates.includes(meal.date)),
    recipes,
    pantryStaples: pantryNames,
  });
  const recipeIds = new Set(recipes.map((recipe) => recipe.id));

  if (mealIngredients.length === 0) {
    await deleteShoppingListForPlan(planId);
    return null;
  }

  let validationErrors: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const messages = shoppingListMessages({
      settings,
      pantryStaples: pantryNames,
      mealIngredients,
      validationErrors,
    });
    const draft = await runJsonPrompt({
      eventType: "shopping_list",
      settings,
      system: messages.system,
      user: messages.user,
      schema: shoppingListDraftSchema,
      logEvent: createAiEvent,
      // Reasoning-capable providers count hidden reasoning against the
      // completion budget. A full multi-meal shopping list also needs room
      // for a large final JSON payload.
      maxTokens: 16384,
    }).catch((error: unknown) => {
      if (error instanceof AppError && error.code === "AI_VALIDATION_FAILED" && attempt === 0) {
        validationErrors = ["The prior response did not match the required JSON schema."];
        return null;
      }
      throw error;
    });

    if (!draft) {
      continue;
    }

    validationErrors = validateShoppingListAgainstRecipes(draft, recipeIds);
    if (validationErrors.length === 0) {
      return replaceShoppingList(
        plan.id,
        settings.aiModel,
        draft.items.map((item, index) => ({
          id: crypto.randomUUID(),
          category: item.category,
          name: item.name,
          quantityText: item.quantityText,
          normalizedName: normalizeShoppingItemName(item.name),
          checked: false,
          sourceRecipeIds: JSON.stringify(item.sourceRecipeIds),
          sortOrder: index,
        })),
      );
    }
  }

  throw new AppError("AI_VALIDATION_FAILED", "AI shopping list referenced invalid recipe IDs.", 502, {
    validationErrors,
  });
}

export async function getShoppingList(planId: string) {
  return getShoppingListForPlan(planId);
}
