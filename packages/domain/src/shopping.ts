import type { MealDto as Meal } from "@mealmind/contracts";
import type { Recipe } from "./recipes.js";
import { isPantryStaple, normalizePantryName } from "./pantry.js";
import { scaleServings } from "./portions.js";

export function buildMealIngredients(input: {
  meals: Meal[];
  recipes: Recipe[];
  pantryStaples: string[];
}) {
  const recipesById = new Map(input.recipes.map((recipe) => [recipe.id, recipe]));

  return input.meals
    .map((meal) => {
      const recipe = recipesById.get(meal.recipeId);
      if (!recipe) {
        return null;
      }

      return {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        mealServings: meal.servings,
        defaultServings: recipe.defaultServings,
        ingredients: recipe.ingredients
          .filter((ingredient) => !isPantryStaple(ingredient, input.pantryStaples))
          .map((ingredient) => scaleServings(ingredient, meal.servings, recipe.defaultServings)),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function normalizeShoppingItemName(name: string) {
  return normalizePantryName(name);
}
