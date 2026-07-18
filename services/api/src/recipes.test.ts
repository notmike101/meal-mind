import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";

const {
  getRecipeDocumentByRecipeIdMock,
  getRecipeImageRecordMock,
  listInvalidRecipeDocumentsMock,
  listRecipeDocumentsMock,
} = vi.hoisted(() => ({
  getRecipeDocumentByRecipeIdMock: vi.fn(),
  getRecipeImageRecordMock: vi.fn(),
  listInvalidRecipeDocumentsMock: vi.fn(),
  listRecipeDocumentsMock: vi.fn(),
}));

vi.mock("@mealmind/db/repositories/recipes", () => ({
  getRecipeDocumentByRecipeId: getRecipeDocumentByRecipeIdMock,
  getRecipeImageRecord: getRecipeImageRecordMock,
  listInvalidRecipeDocuments: listInvalidRecipeDocumentsMock,
  listRecipeDocuments: listRecipeDocumentsMock,
}));

import { getRecipeDetail, getRecipeImage, listRecipes } from "./recipes";
import { registerRoutes } from "./routes";

function createRecipeDocument(includeImage = true) {
  return {
    documentId: "document-photo",
    recipeId: "photo-recipe",
    origin: "url" as const,
    status: "valid" as const,
    sourceUrl: "https://recipes.example.test/photo",
    sourcePath: null,
    title: "Photo Recipe",
    description: "",
    defaultServings: 2,
    suggestedSlots: ["dinner"],
    tags: [],
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    cooklang: `---
id: photo-recipe
title: Photo Recipe
servings: 2
mealTypes: [dinner]
---

Cook @rice{1%cup} in a #pot{}.
`,
    contentHash: "hash-photo",
    parseErrors: [],
    imageBytes: includeImage ? Buffer.from("image") : null,
    imageContentType: includeImage ? "image/webp" : null,
    createdAt: "2026-07-15T00:00:00.000Z",
    updatedAt: "2026-07-15T00:00:00.000Z",
  };
}

beforeEach(() => {
  const document = createRecipeDocument();
  listRecipeDocumentsMock.mockResolvedValue([document]);
  listInvalidRecipeDocumentsMock.mockResolvedValue([]);
  getRecipeDocumentByRecipeIdMock.mockResolvedValue(document);
  getRecipeImageRecordMock.mockResolvedValue({
    imageBytes: document.imageBytes,
    imageContentType: document.imageContentType,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("database-backed recipe images", () => {
  it("publishes an image URL and resolves the cached database image", async () => {
    const catalog = await listRecipes();
    expect(catalog.recipes[0]?.imageUrl).toBe("/api/recipes/photo-recipe/image");
    await expect(getRecipeImage("photo-recipe")).resolves.toMatchObject({ contentType: "image/webp" });
  });

  it("keeps recipes usable when the cached image is missing", async () => {
    const document = createRecipeDocument(false);
    listRecipeDocumentsMock.mockResolvedValue([document]);
    getRecipeDocumentByRecipeIdMock.mockResolvedValue(document);
    getRecipeImageRecordMock.mockResolvedValue({ imageBytes: null, imageContentType: null });

    expect((await listRecipes()).recipes[0]?.imageUrl).toBeNull();
    await expect(getRecipeImage("photo-recipe")).resolves.toBeNull();
  });

  it("serves cached images with a stable content type and cache policy", async () => {
    const app = Fastify();
    registerRoutes(app);

    const response = await app.inject({ method: "GET", url: "/api/recipes/photo-recipe/image" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/webp");
    expect(response.headers["cache-control"]).toBe("public, max-age=86400");
    expect(response.rawPayload).toEqual(Buffer.from("image"));
    await app.close();
  });

  it("returns recipe details scaled to the requested servings", async () => {
    const recipe = await getRecipeDetail("photo-recipe", 4);

    expect(recipe?.defaultServings).toBe(2);
    expect(recipe?.ingredients).toEqual(["2 c rice"]);
    expect(recipe?.instructions).toContain("Cook 2 c rice");
  });

  it("accepts servings on the recipe detail route", async () => {
    const app = Fastify();
    registerRoutes(app);

    const response = await app.inject({ method: "GET", url: "/api/recipes/photo-recipe?servings=4" });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.ingredients).toEqual(["2 c rice"]);
    await app.close();
  });
});
