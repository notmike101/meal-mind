import { describe, expect, it } from "vitest";
import { parseRecipeMarkdown } from "./recipes";

const validRecipe = `---
id: test-recipe
title: Test Recipe
description: A short test recipe.
defaultServings: 2
mealTypes: [lunch, dinner]
tags: [easy]
prepTimeMinutes: 5
cookTimeMinutes: 10
---

## Ingredients
- 1 cup rice
- 2 eggs

## Instructions
1. Cook rice.
2. Add eggs.
`;

describe("parseRecipeMarkdown", () => {
  it("parses valid recipe front matter and sections", () => {
    const recipe = parseRecipeMarkdown(validRecipe, "recipes/test-recipe.md");

    expect(recipe.id).toBe("test-recipe");
    expect(recipe.title).toBe("Test Recipe");
    expect(recipe.description).toBe("A short test recipe.");
    expect(recipe.defaultServings).toBe(2);
    expect(recipe.mealTypes).toEqual(["lunch", "dinner"]);
    expect(recipe.ingredients).toEqual(["1 cup rice", "2 eggs"]);
    expect(recipe.instructions).toContain("Cook rice");
  });

  it("rejects recipes without ingredients", () => {
    expect(() =>
      parseRecipeMarkdown(
        `---
id: bad-recipe
title: Bad Recipe
defaultServings: 1
mealTypes: [lunch]
---

## Instructions
1. Nothing.
`,
        "recipes/bad-recipe.md",
      ),
    ).toThrow("Ingredients");
  });
});
