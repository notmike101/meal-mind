import {
  CooklangParser,
  grouped_quantity_display,
  grouped_quantity_is_empty,
  ingredient_display_name,
  ingredient_should_be_listed,
  quantity_display,
  type Content,
  type CooklangRecipe as ParsedCooklangRecipe,
  type Cookware,
  type Ingredient,
  type Item,
  type Quantity,
  type Step,
  type Timer,
  type Value,
} from "@cooklang/cooklang";
import type {
  CooklangCookwareDto,
  CooklangIngredientDto,
  CooklangQuantityDto,
  CooklangRecipeDto,
  CooklangSectionDto,
  CooklangStepDto,
  CooklangTimerDto,
  CooklangTokenDto,
  CooklangValueDto,
} from "@mealmind/contracts";
import { globSync } from "glob";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const mealTypeSchema = z.enum(["lunch", "dinner"]);
const imagePathSchema = z.string().trim().refine((value) => {
  const normalized = value.replaceAll("\\", "/");
  return normalized === value
    && !normalized.startsWith("/")
    && !/^[a-z]:/i.test(normalized)
    && !normalized.split("/").includes("..")
    && /\.(?:jpe?g|png|webp)$/i.test(normalized);
}, "Use a safe relative JPEG, PNG, or WebP path with forward slashes.");

const recipeMetadataSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase kebab-case."),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  defaultServings: z.coerce.number().int().min(1).max(12),
  mealTypes: z.array(mealTypeSchema).min(1),
  tags: z.array(z.string()).optional().default([]),
  image: imagePathSchema.optional(),
  prepTimeMinutes: z.coerce.number().int().min(0).optional(),
  cookTimeMinutes: z.coerce.number().int().min(0).optional(),
});

export type Recipe = z.infer<typeof recipeMetadataSchema> & {
  format: "cooklang";
  filePath: string;
  ingredients: string[];
  instructions: string;
  cooklang: CooklangRecipeDto;
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
  return process.env.MEALMIND_RECIPE_ROOT || path.join(process.cwd(), "recipes");
}

function normalizeFilePath(filePath: string) {
  const recipeRoot = getRecipeRoot();
  return path.relative(recipeRoot, filePath).replaceAll("\\", "/");
}

function metadataToRecord(metadata: Map<unknown, unknown>) {
  return Object.fromEntries([...metadata.entries()].map(([key, value]) => [String(key), value]));
}

function getRecipeTime(recipe: ParsedCooklangRecipe) {
  if (typeof recipe.time === "number") {
    return {
      prepTimeMinutes: undefined,
      cookTimeMinutes: recipe.time,
    };
  }

  return {
    prepTimeMinutes: recipe.time?.prep_time,
    cookTimeMinutes: recipe.time?.cook_time,
  };
}

function readRecipeMetadata(recipe: ParsedCooklangRecipe) {
  const rawMetadata = metadataToRecord(recipe.rawMetadata);
  const recipeTime = getRecipeTime(recipe);

  return recipeMetadataSchema.parse({
    id: rawMetadata.id,
    title: rawMetadata.title ?? recipe.title,
    description: rawMetadata.description ?? recipe.description ?? "",
    defaultServings: rawMetadata.defaultServings ?? rawMetadata.servings ?? recipe.servings,
    mealTypes: rawMetadata.mealTypes,
    tags: rawMetadata.tags ?? [...recipe.tags],
    image: rawMetadata.image,
    prepTimeMinutes: rawMetadata.prepTimeMinutes ?? recipeTime.prepTimeMinutes,
    cookTimeMinutes: rawMetadata.cookTimeMinutes ?? recipeTime.cookTimeMinutes,
  });
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record.type === "regular") {
    return numberValue(record.value);
  }

  if (record.type === "fraction" && record.value && typeof record.value === "object") {
    const fraction = record.value as Record<string, unknown>;
    const whole = numberValue(fraction.whole) ?? 0;
    const numerator = numberValue(fraction.num);
    const denominator = numberValue(fraction.den);
    if (numerator !== null && denominator) {
      return whole + numerator / denominator;
    }
  }

  return null;
}

function cooklangValue(value: Value): CooklangValueDto {
  if (value.type === "number") {
    return {
      type: "number",
      value: numberValue(value.value) ?? 0,
    };
  }

  if (value.type === "range") {
    return {
      type: "range",
      start: numberValue(value.value.start) ?? 0,
      end: numberValue(value.value.end) ?? 0,
    };
  }

  return {
    type: "text",
    value: value.value,
  };
}

function cooklangQuantity(quantity: Quantity | null): CooklangQuantityDto | null {
  if (!quantity) {
    return null;
  }

  return {
    value: cooklangValue(quantity.value),
    unit: quantity.unit,
    scalable: quantity.scalable,
    displayText: quantity_display(quantity),
  };
}

function displayComponent(input: {
  name: string | null;
  alias?: string | null;
  note?: string | null;
  quantity?: CooklangQuantityDto | null;
}) {
  const name = input.alias ?? input.name ?? "timer";
  const display = [input.quantity?.displayText, name].filter(Boolean).join(" ").trim() || name;
  return input.note ? `${display} (${input.note})` : display;
}

function componentStepNumbers(stepMap: Map<number, Set<number>>, index: number) {
  return [...(stepMap.get(index) ?? new Set<number>())].sort((a, b) => a - b);
}

function collectStepMaps(recipe: ParsedCooklangRecipe) {
  const ingredientSteps = new Map<number, Set<number>>();
  const cookwareSteps = new Map<number, Set<number>>();
  const timerSteps = new Map<number, Set<number>>();

  const add = (map: Map<number, Set<number>>, index: number, stepNumber: number) => {
    map.set(index, (map.get(index) ?? new Set<number>()).add(stepNumber));
  };

  for (const section of recipe.sections) {
    for (const content of section.content) {
      if (content.type !== "step") {
        continue;
      }

      for (const item of content.value.items) {
        if (item.type === "ingredient") {
          add(ingredientSteps, item.index, content.value.number);
        } else if (item.type === "cookware") {
          add(cookwareSteps, item.index, content.value.number);
        } else if (item.type === "timer") {
          add(timerSteps, item.index, content.value.number);
        }
      }
    }
  }

  return { ingredientSteps, cookwareSteps, timerSteps };
}

function ingredientDto(ingredient: Ingredient, stepNumbers: number[]): CooklangIngredientDto {
  const quantity = cooklangQuantity(ingredient.quantity);
  return {
    name: ingredient.name,
    alias: ingredient.alias,
    note: ingredient.note,
    quantity,
    displayText: displayComponent({
      name: ingredient.name,
      alias: ingredient.alias,
      note: ingredient.note,
      quantity,
    }),
    stepNumbers,
  };
}

function cookwareDto(cookware: Cookware, stepNumbers: number[]): CooklangCookwareDto {
  const quantity = cooklangQuantity(cookware.quantity);
  return {
    name: cookware.name,
    alias: cookware.alias,
    note: cookware.note,
    quantity,
    displayText: displayComponent({
      name: cookware.name,
      alias: cookware.alias,
      note: cookware.note,
      quantity,
    }),
    stepNumbers,
  };
}

function timerDto(timer: Timer, stepNumbers: number[]): CooklangTimerDto {
  const quantity = cooklangQuantity(timer.quantity);
  return {
    name: timer.name,
    quantity,
    displayText: quantity?.displayText ?? timer.name ?? "timer",
    stepNumbers,
  };
}

function stepTextFromTokens(tokens: CooklangTokenDto[]) {
  return tokens.map((token) => token.text).join("").trim();
}

function tokenFromItem(input: {
  item: Item;
  ingredients: CooklangIngredientDto[];
  cookware: CooklangCookwareDto[];
  timers: CooklangTimerDto[];
  inlineQuantities: Quantity[];
}): CooklangTokenDto {
  const { item, ingredients, cookware, timers, inlineQuantities } = input;

  if (item.type === "text") {
    return {
      type: "text",
      text: item.value,
    };
  }

  if (item.type === "ingredient") {
    const ingredient = ingredients[item.index];
    return {
      type: "ingredient",
      ingredient,
      text: ingredient.displayText,
    };
  }

  if (item.type === "cookware") {
    const cookwareItem = cookware[item.index];
    return {
      type: "cookware",
      cookware: cookwareItem,
      text: cookwareItem.displayText,
    };
  }

  if (item.type === "timer") {
    const timer = timers[item.index];
    return {
      type: "timer",
      timer,
      text: timer.displayText,
    };
  }

  const quantity = cooklangQuantity(inlineQuantities[item.index]) ?? {
    value: null,
    unit: null,
    scalable: false,
    displayText: null,
  };
  return {
    type: "quantity",
    quantity,
    text: quantity.displayText ?? "",
  };
}

function stepDto(
  step: Step,
  ingredients: CooklangIngredientDto[],
  cookware: CooklangCookwareDto[],
  timers: CooklangTimerDto[],
  inlineQuantities: Quantity[],
): CooklangStepDto {
  const tokens = step.items.map((item) =>
    tokenFromItem({
      item,
      ingredients,
      cookware,
      timers,
      inlineQuantities,
    }),
  );

  return {
    number: step.number,
    text: stepTextFromTokens(tokens),
    tokens,
  };
}

function sectionContentDto(
  content: Content,
  ingredients: CooklangIngredientDto[],
  cookware: CooklangCookwareDto[],
  timers: CooklangTimerDto[],
  inlineQuantities: Quantity[],
) {
  if (content.type === "text") {
    return {
      type: "text" as const,
      text: content.value,
    };
  }

  return {
    type: "step" as const,
    step: stepDto(content.value, ingredients, cookware, timers, inlineQuantities),
  };
}

function cooklangDto(recipe: ParsedCooklangRecipe): CooklangRecipeDto {
  const { ingredientSteps, cookwareSteps, timerSteps } = collectStepMaps(recipe);
  const ingredients = recipe.ingredients.map((ingredient, index) =>
    ingredientDto(ingredient, componentStepNumbers(ingredientSteps, index)),
  );
  const cookware = recipe.cookware.map((cookwareItem, index) =>
    cookwareDto(cookwareItem, componentStepNumbers(cookwareSteps, index)),
  );
  const timers = recipe.timers.map((timer, index) => timerDto(timer, componentStepNumbers(timerSteps, index)));
  const sections: CooklangSectionDto[] = recipe.sections.map((section) => ({
    name: section.name,
    content: section.content.map((content) =>
      sectionContentDto(content, ingredients, cookware, timers, recipe.inlineQuantities),
    ),
  }));

  return {
    metadata: metadataToRecord(recipe.rawMetadata),
    ingredients,
    cookware,
    timers,
    sections,
  };
}

function plainInstructions(cooklang: CooklangRecipeDto) {
  return cooklang.sections
    .flatMap((section) => section.content)
    .filter((content): content is { type: "step"; step: CooklangStepDto } => content.type === "step")
    .map((content) => `${content.step.number}. ${content.step.text}`)
    .join("\n");
}

function groupedIngredientDisplayTexts(recipe: ParsedCooklangRecipe) {
  return recipe.groupedIngredients
    .filter(([ingredient]) => ingredient_should_be_listed(ingredient))
    .map(([ingredient, quantity]) => {
      const relation = ingredient.relation.relation;
      const hasReferences = relation.type === "definition" && relation.referenced_from.length > 0;
      const quantityText = hasReferences
        ? grouped_quantity_is_empty(quantity)
          ? ""
          : grouped_quantity_display(quantity)
        : ingredient.quantity
          ? quantity_display(ingredient.quantity)
          : "";
      const display = [quantityText, ingredient_display_name(ingredient)].filter(Boolean).join(" ").trim();
      return ingredient.note ? `${display} (${ingredient.note})` : display;
    });
}

export function parseRecipeCooklang(content: string, filePath: string): Recipe {
  const parser = new CooklangParser();
  const [parsedRecipe, report] = parser.parse(content);
  if (report.trim()) {
    throw new Error(report.trim());
  }

  const metadata = readRecipeMetadata(parsedRecipe);
  const cooklang = cooklangDto(parsedRecipe);
  if (cooklang.ingredients.length === 0) {
    throw new Error("Missing CookLang ingredient references.");
  }

  const instructions = plainInstructions(cooklang);
  if (!instructions) {
    throw new Error("Missing CookLang instruction steps.");
  }

  return {
    ...metadata,
    format: "cooklang",
    filePath,
    ingredients: groupedIngredientDisplayTexts(parsedRecipe),
    instructions,
    cooklang,
  };
}

export function loadRecipes(): RecipeLoadResult {
  const recipeRoot = getRecipeRoot();
  fs.mkdirSync(recipeRoot, { recursive: true });

  const cooklangFiles = globSync("**/*.cook", {
    cwd: recipeRoot,
    absolute: true,
    nodir: true,
  }).sort();

  const recipes: Recipe[] = [];
  const invalidRecipes: InvalidRecipe[] = [];

  for (const cooklangFile of cooklangFiles) {
    const relativePath = normalizeFilePath(cooklangFile);
    try {
      recipes.push(parseRecipeCooklang(fs.readFileSync(cooklangFile, "utf8"), relativePath));
    } catch (error) {
      const errors =
        error instanceof z.ZodError
          ? error.issues.map((issue) => `${issue.path.join(".") || "metadata"}: ${issue.message}`)
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
