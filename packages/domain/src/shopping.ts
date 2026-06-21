import type { MealSlotDto as MealSlot } from "@mealmind/contracts";
import type { Recipe } from "./recipes.js";
import { isPantryStaple, normalizePantryName } from "./pantry.js";
import { scaleServings } from "./portions.js";

export function buildMealIngredients(input: {
  slots: MealSlot[];
  recipes: Recipe[];
  pantryStaples: string[];
}) {
  const recipesById = new Map(input.recipes.map((recipe) => [recipe.id, recipe]));

  return input.slots
    .map((slot) => {
      const recipe = recipesById.get(slot.recipeId);
      if (!recipe) {
        return null;
      }

      return {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        slotServings: slot.servings,
        defaultServings: recipe.defaultServings,
        ingredients: recipe.ingredients
          .filter((ingredient) => !isPantryStaple(ingredient, input.pantryStaples))
          .map((ingredient) => scaleServings(ingredient, slot.servings, recipe.defaultServings)),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function normalizeShoppingItemName(name: string) {
  return normalizePantryName(name);
}
