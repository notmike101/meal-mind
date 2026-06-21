import matter from "gray-matter";
import { globSync } from "glob";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const mealTypeSchema = z.enum(["lunch", "dinner"]);

const recipeFrontmatterSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase kebab-case."),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  defaultServings: z.coerce.number().int().min(1).max(12),
  mealTypes: z.array(mealTypeSchema).min(1),
  tags: z.array(z.string()).optional().default([]),
  prepTimeMinutes: z.coerce.number().int().min(0).optional(),
  cookTimeMinutes: z.coerce.number().int().min(0).optional(),
});

export type Recipe = z.infer<typeof recipeFrontmatterSchema> & {
  filePath: string;
  ingredients: string[];
  instructions: string;
};

export type InvalidRecipe = {
  filePath: string;
  errors: string[];
};

export type RecipeLoadResult = {
  recipes: Recipe[];
  invalidRecipes: InvalidRecipe[];
};

export function getInstructionSteps(instructions: string) {
  return instructions
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}

export function getRecipeDescription(recipe: Pick<Recipe, "description" | "tags" | "mealTypes">) {
  if (recipe.description.trim()) {
    return recipe.description.trim();
  }

  const categories = [...recipe.tags, ...recipe.mealTypes].filter(Boolean);
  if (categories.length > 0) {
    return `${categories.slice(0, 3).join(", ")} recipe.`;
  }

  return "Recipe available for meal planning.";
}

function getRecipeRoot() {
  return process.env.HELLOQWEN_RECIPE_ROOT || path.join(process.cwd(), "recipes");
}

function normalizeFilePath(filePath: string) {
  const recipeRoot = getRecipeRoot();
  return path.relative(recipeRoot, filePath).replaceAll("\\", "/");
}

function extractSection(markdown: string, heading: string) {
  const lines = markdown.split(/\r?\n/);
  const headingPattern = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
  const sectionStart = lines.findIndex((line) => headingPattern.test(line.trim()));
  if (sectionStart === -1) {
    return "";
  }

  const sectionLines: string[] = [];
  for (const line of lines.slice(sectionStart + 1)) {
    if (/^##\s+/.test(line.trim())) {
      break;
    }
    sectionLines.push(line);
  }

  return sectionLines.join("\n").trim();
}

function parseIngredientLines(section: string) {
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

export function parseRecipeMarkdown(content: string, filePath: string): Recipe {
  const parsed = matter(content);
  const frontmatter = recipeFrontmatterSchema.parse(parsed.data);
  const ingredientsSection = extractSection(parsed.content, "Ingredients");
  const instructionsSection = extractSection(parsed.content, "Instructions");

  const ingredients = parseIngredientLines(ingredientsSection);
  if (ingredients.length === 0) {
    throw new Error("Missing non-empty ## Ingredients section.");
  }

  if (!instructionsSection) {
    throw new Error("Missing non-empty ## Instructions section.");
  }

  return {
    ...frontmatter,
    filePath,
    ingredients,
    instructions: instructionsSection,
  };
}

export function loadRecipes(): RecipeLoadResult {
  const recipeRoot = getRecipeRoot();
  fs.mkdirSync(recipeRoot, { recursive: true });

  const markdownFiles = globSync("**/*.md", {
    cwd: recipeRoot,
    absolute: true,
    nodir: true,
  }).sort();

  const recipes: Recipe[] = [];
  const invalidRecipes: InvalidRecipe[] = [];

  for (const markdownFile of markdownFiles) {
    const relativePath = normalizeFilePath(markdownFile);
    try {
      recipes.push(parseRecipeMarkdown(fs.readFileSync(markdownFile, "utf8"), relativePath));
    } catch (error) {
      const errors =
        error instanceof z.ZodError
          ? error.issues.map((issue) => `${issue.path.join(".") || "frontmatter"}: ${issue.message}`)
          : [error instanceof Error ? error.message : String(error)];
      invalidRecipes.push({ filePath: relativePath, errors });
    }
  }

  const recipesById = new Map<string, Recipe[]>();
  for (const recipe of recipes) {
    recipesById.set(recipe.id, [...(recipesById.get(recipe.id) ?? []), recipe]);
  }

  const duplicateIds = new Set(
    [...recipesById.entries()].filter(([, duplicates]) => duplicates.length > 1).map(([id]) => id),
  );

  if (duplicateIds.size > 0) {
    const uniqueRecipes = recipes.filter((recipe) => !duplicateIds.has(recipe.id));
    for (const duplicateId of duplicateIds) {
      for (const recipe of recipesById.get(duplicateId) ?? []) {
        invalidRecipes.push({
          filePath: recipe.filePath,
          errors: [`Duplicate recipe id "${duplicateId}". Recipe excluded from planning.`],
        });
      }
    }

    return {
      recipes: uniqueRecipes,
      invalidRecipes,
    };
  }

  return { recipes, invalidRecipes };
}

export function getRecipeById(recipeId: string) {
  return loadRecipes().recipes.find((recipe) => recipe.id === recipeId) ?? null;
}
