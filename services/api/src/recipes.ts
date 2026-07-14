import {
  getRecipeById,
  getRecipeByIdAtServings,
  getRecipeDescription,
  loadRecipes,
  type Recipe,
} from "@mealmind/domain";
import type { RecipeFilterRequest } from "@mealmind/contracts";
import fs from "node:fs";
import path from "node:path";

const imageContentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function recipeRoot() {
  return path.resolve(process.env.MEALMIND_RECIPE_ROOT || path.join(process.cwd(), "recipes"));
}

function resolveRecipeImage(recipe: Pick<Recipe, "image">) {
  if (!recipe.image) return null;
  const root = recipeRoot();
  const filePath = path.resolve(root, recipe.image);
  const relative = path.relative(root, filePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  const contentType = imageContentTypes[path.extname(filePath).toLowerCase()];
  if (!contentType || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
  return { filePath, contentType };
}

export function getRecipeImage(recipeId: string) {
  const recipe = getRecipeById(recipeId);
  return recipe ? resolveRecipeImage(recipe) : null;
}

export function summarizeRecipe(recipe: Recipe) {
  const image = resolveRecipeImage(recipe);
  return {
    id: recipe.id,
    title: recipe.title,
    description: getRecipeDescription(recipe),
    imageUrl: image ? `/api/recipes/${encodeURIComponent(recipe.id)}/image` : null,
    format: recipe.format,
    suggestedSlots: recipe.suggestedSlots,
    tags: recipe.tags,
    defaultServings: recipe.defaultServings,
    prepTimeMinutes: recipe.prepTimeMinutes ?? undefined,
    cookTimeMinutes: recipe.cookTimeMinutes ?? undefined,
    totalTimeMinutes: (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0),
    ingredientCount: recipe.ingredients.length,
    cookwareCount: recipe.cooklang.cookware.length,
    timerCount: recipe.cooklang.timers.length,
    filePath: recipe.filePath,
    detailResource: `mealmind://recipes/${recipe.id}`,
    appUrl: `/recipes/${recipe.id}`,
  };
}

export function detailedRecipe(recipe: Recipe) {
  return {
    ...summarizeRecipe(recipe),
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    cooklang: recipe.cooklang,
  };
}

export function listRecipes(input: RecipeFilterRequest = {}) {
  const { recipes, invalidRecipes } = loadRecipes();
  const search = input.search?.trim().toLowerCase();
  const tag = input.tag?.trim().toLowerCase();
  const suggestedSlot = input.suggestedSlot?.trim().toLowerCase();

  const filteredRecipes = recipes.filter((recipe) => {
     if (suggestedSlot && !recipe.suggestedSlots.some((slot) => slot.toLowerCase() === suggestedSlot)) {
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

export function getRecipeDetail(recipeId: string, servings?: number) {
  const recipe = servings === undefined ? getRecipeById(recipeId) : getRecipeByIdAtServings(recipeId, servings);
  return recipe ? detailedRecipe(recipe) : null;
}
