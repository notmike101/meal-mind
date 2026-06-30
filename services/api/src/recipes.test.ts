import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import Fastify from "fastify";
import { getRecipeImage, listRecipes } from "./recipes";
import { registerRoutes } from "./routes";

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

  it("serves declared images with a stable content type and cache policy", async () => {
    createRecipeRoot(true);
    const app = Fastify();
    registerRoutes(app);
    const response = await app.inject({ method: "GET", url: "/api/recipes/photo-recipe/image" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/webp");
    expect(response.headers["cache-control"]).toBe("public, max-age=86400");
    expect(response.rawPayload).toEqual(Buffer.from("image"));
    await app.close();
  });
});
