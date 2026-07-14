import { describe, expect, it } from "vitest";
import { parseRecipeCooklang } from "./recipes";

const validRecipe = `---
id: test-recipe
title: Test Recipe
description: A short test recipe.
servings: 2
mealTypes: [lunch, dinner]
tags: [easy]
image: images/test-recipe.webp
prep time: 5 minutes
cook time: 10 minutes
---

Cook @rice{1%cup} in a #pot{} for ~rice{10%minutes}.

Add @eggs{2} and season with @salt{}.
`;

describe("parseRecipeCooklang", () => {
  it("parses valid metadata, flat fields, and CookLang tokens", () => {
    const recipe = parseRecipeCooklang(validRecipe, "recipes/test-recipe.cook");

    expect(recipe.id).toBe("test-recipe");
    expect(recipe.title).toBe("Test Recipe");
    expect(recipe.description).toBe("A short test recipe.");
    expect(recipe.format).toBe("cooklang");
    expect(recipe.defaultServings).toBe(2);
    expect(recipe.suggestedSlots).toEqual(["lunch", "dinner"]);
    expect(recipe.image).toBe("images/test-recipe.webp");
    expect(recipe.prepTimeMinutes).toBe(5);
    expect(recipe.cookTimeMinutes).toBe(10);
    expect(recipe.ingredients).toEqual(["1 cup rice", "2 eggs", "salt"]);
    expect(recipe.instructions).toContain("Cook 1 cup rice in a pot for 10 minutes.");
    expect(recipe.cooklang.ingredients).toHaveLength(3);
    expect(recipe.cooklang.cookware[0]).toMatchObject({ name: "pot", displayText: "pot", stepNumbers: [1] });
    expect(recipe.cooklang.timers[0]).toMatchObject({ name: "rice", displayText: "10 minutes", stepNumbers: [1] });
    expect(recipe.cooklang.sections[0]?.content[0]).toMatchObject({
      type: "step",
      step: {
        number: 1,
        tokens: expect.arrayContaining([
          expect.objectContaining({ type: "ingredient", text: "1 cup rice" }),
          expect.objectContaining({ type: "cookware", text: "pot" }),
          expect.objectContaining({ type: "timer", text: "10 minutes" }),
        ]),
      },
    });
  });

  it("rejects recipes without CookLang ingredients", () => {
    expect(() =>
      parseRecipeCooklang(
        `---
id: bad-recipe
title: Bad Recipe
servings: 1
mealTypes: [lunch]
---

Nothing to do.
`,
        "recipes/bad-recipe.cook",
      ),
    ).toThrow("ingredient");
  });

  it("rejects unsafe recipe image paths", () => {
    expect(() => parseRecipeCooklang(validRecipe.replace("images/test-recipe.webp", "../secret.jpg"), "bad.cook"))
      .toThrow("safe relative");
  });

  it("groups repeated scalable ingredient uses while preserving per-step amounts", () => {
    const recipe = parseRecipeCooklang(
      `---
id: butter-test
title: Butter Test
servings: 2
mealTypes: [dinner]
---

Melt @butter{1%tbsp} in a #bowl{}.

Toss with @&butter{1%tbsp}.
`,
      "recipes/butter-test.cook",
    );

    expect(recipe.ingredients).toEqual(["2 tbsp butter"]);
    expect(recipe.instructions).toContain("Melt 1 tbsp butter in a bowl.");
    expect(recipe.instructions).toContain("Toss with 1 tbsp butter.");
    expect(recipe.cooklang.ingredients).toHaveLength(2);
  });

  it("scales ingredient totals and instruction quantities", () => {
    const recipe = parseRecipeCooklang(validRecipe, "recipes/test-recipe.cook", 1.5, 2);

    expect(recipe.defaultServings).toBe(2);
    expect(recipe.ingredients).toEqual(["1 1/2 c rice", "3 eggs", "salt"]);
    expect(recipe.instructions).toContain("Cook 1 1/2 c rice");
    expect(recipe.instructions).toContain("Add 3 eggs");
  });
});
