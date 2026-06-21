import {
  getRecipeById,
  getRecipeDescription,
  loadRecipes,
  type Recipe,
} from "@helloqwen/domain";
import type { RecipeFilterRequest } from "@helloqwen/contracts";

export function summarizeRecipe(recipe: Recipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    description: getRecipeDescription(recipe),
    mealTypes: recipe.mealTypes,
    tags: recipe.tags,
    defaultServings: recipe.defaultServings,
    prepTimeMinutes: recipe.prepTimeMinutes ?? undefined,
    cookTimeMinutes: recipe.cookTimeMinutes ?? undefined,
    totalTimeMinutes: (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0),
    ingredientCount: recipe.ingredients.length,
    filePath: recipe.filePath,
    detailResource: `helloqwen://recipes/${recipe.id}`,
    appUrl: `/recipes/${recipe.id}`,
  };
}

export function detailedRecipe(recipe: Recipe) {
  return {
    ...summarizeRecipe(recipe),
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  };
}

export function listRecipes(input: RecipeFilterRequest = {}) {
  const { recipes, invalidRecipes } = loadRecipes();
  const search = input.search?.trim().toLowerCase();
  const tag = input.tag?.trim().toLowerCase();

  const filteredRecipes = recipes.filter((recipe) => {
    if (input.mealType && !recipe.mealTypes.includes(input.mealType)) {
      return false;
    }
    if (tag && !recipe.tags.some((recipeTag) => recipeTag.toLowerCase() === tag)) {
      return false;
    }
    if (search) {
      const haystack = [
        recipe.title,
        recipe.description,
        recipe.id,
        ...recipe.tags,
        ...recipe.ingredients,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    }
    return true;
  });

  return {
    recipes: filteredRecipes.map(summarizeRecipe),
    invalidRecipes,
    count: filteredRecipes.length,
  };
}

export function getRecipeDetail(recipeId: string) {
  const recipe = getRecipeById(recipeId);
  return recipe ? detailedRecipe(recipe) : null;
}
