import {
  getRecipeDescription,
  parseRecipeCooklang,
  type InvalidRecipe,
  type Recipe,
} from "@mealmind/domain";
import type { RecipeFilterRequest } from "@mealmind/contracts";
import {
  getRecipeDocumentByRecipeId,
  getRecipeImageRecord,
  listInvalidRecipeDocuments,
  listRecipeDocuments,
  type RecipeDocument,
} from "@mealmind/db/repositories/recipes";

type RecipeEntry = {
  recipe: Recipe;
  document: RecipeDocument;
};

export type RecipeCatalog = {
  entries: RecipeEntry[];
  recipes: Recipe[];
  invalidRecipes: InvalidRecipe[];
};

function documentPath(document: RecipeDocument) {
  return document.sourcePath ?? `database/${document.recipeId ?? document.documentId}.cook`;
}

function parseDocument(document: RecipeDocument, servings?: number) {
  const base = parseRecipeCooklang(document.cooklang, documentPath(document));
  if (servings === undefined || servings === base.defaultServings) return base;
  return parseRecipeCooklang(
    document.cooklang,
    documentPath(document),
    servings / base.defaultServings,
    base.defaultServings,
  );
}

function parseErrors(error: unknown) {
  return [error instanceof Error ? error.message : String(error)];
}

export async function getRecipeCatalog(): Promise<RecipeCatalog> {
  const [documents, invalidDocuments] = await Promise.all([
    listRecipeDocuments(),
    listInvalidRecipeDocuments(),
  ]);
  const entries: RecipeEntry[] = [];
  const invalidRecipes: InvalidRecipe[] = invalidDocuments.map((document) => ({
    filePath: document.sourcePath ?? document.sourceUrl ?? `database/${document.documentId}`,
    errors: document.parseErrors.length > 0 ? document.parseErrors : ["Recipe document is invalid."],
  }));

  for (const document of documents) {
    try {
      const recipe = parseDocument(document);
      entries.push({ recipe, document });
    } catch (error) {
      invalidRecipes.push({ filePath: documentPath(document), errors: parseErrors(error) });
    }
  }

  return {
    entries,
    recipes: entries.map((entry) => entry.recipe),
    invalidRecipes,
  };
}

function recipeImageUrl(recipeId: string, document: RecipeDocument) {
  return document.imageBytes && document.imageBytes.length > 0 && document.imageContentType
    ? `/api/recipes/${encodeURIComponent(recipeId)}/image`
    : null;
}

export function summarizeRecipe(recipe: Recipe, document: RecipeDocument) {
  return {
    id: recipe.id,
    title: recipe.title,
    description: getRecipeDescription(recipe),
    imageUrl: recipeImageUrl(recipe.id, document),
    sourceUrl: document.sourceUrl,
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
    filePath: document.sourcePath,
    detailResource: `mealmind://recipes/${recipe.id}`,
    appUrl: `/recipes/${recipe.id}`,
  };
}

export function detailedRecipe(recipe: Recipe, document: RecipeDocument) {
  return {
    ...summarizeRecipe(recipe, document),
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    cooklang: recipe.cooklang,
  };
}

export async function listRecipes(input: RecipeFilterRequest = {}) {
  const catalog = await getRecipeCatalog();
  const search = input.search?.trim().toLowerCase();
  const tag = input.tag?.trim().toLowerCase();
  const suggestedSlot = input.suggestedSlot?.trim().toLowerCase();

  const filteredEntries = catalog.entries.filter(({ recipe }) => {
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
    recipes: filteredEntries.map(({ recipe, document }) => summarizeRecipe(recipe, document)),
    invalidRecipes: catalog.invalidRecipes,
    count: filteredEntries.length,
  };
}

export async function getRecipeDetail(recipeId: string, servings?: number) {
  const document = await getRecipeDocumentByRecipeId(recipeId);
  if (!document) return null;
  const recipe = parseDocument(document, servings);
  return detailedRecipe(recipe, document);
}

export async function getRecipeImage(recipeId: string) {
  const image = await getRecipeImageRecord(recipeId);
  if (!image?.imageBytes || !image.imageContentType) return null;
  return { data: image.imageBytes, contentType: image.imageContentType };
}

export async function getAvailableRecipes() {
  return (await getRecipeCatalog()).recipes;
}
