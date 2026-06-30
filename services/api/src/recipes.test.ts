import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getRecipeImage, listRecipes } from "./recipes";

const originalRecipeRoot = process.env.MEALMIND_RECIPE_ROOT;
const temporaryRoots: string[] = [];

afterEach(() => {
  process.env.MEALMIND_RECIPE_ROOT = originalRecipeRoot;
  for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function createRecipeRoot(includeImage: boolean) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mealmind-recipes-"));
  temporaryRoots.push(root);
  fs.mkdirSync(path.join(root, "images"));
  if (includeImage) fs.writeFileSync(path.join(root, "images", "photo.webp"), Buffer.from("image"));
  fs.writeFileSync(path.join(root, "photo.cook"), `---
id: photo-recipe
title: Photo Recipe
servings: 2
mealTypes: [dinner]
image: images/photo.webp
---

Cook @rice{1%cup} in a #pot{}.
`);
  process.env.MEALMIND_RECIPE_ROOT = root;
}

describe("recipe images", () => {
  it("publishes an image URL and resolves the declared local file", () => {
    createRecipeRoot(true);
    expect(listRecipes().recipes[0]?.imageUrl).toBe("/api/recipes/photo-recipe/image");
    expect(getRecipeImage("photo-recipe")).toMatchObject({ contentType: "image/webp" });
  });

  it("keeps recipes usable when the declared image file is missing", () => {
    createRecipeRoot(false);
    expect(listRecipes().recipes[0]?.imageUrl).toBeNull();
    expect(getRecipeImage("photo-recipe")).toBeNull();
  });
});
