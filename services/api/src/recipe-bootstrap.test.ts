import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  getRecipeDocumentByRecipeId: vi.fn(),
  getRecipeDocumentBySourcePath: vi.fn(),
  upsertFileRecipeDocument: vi.fn(),
}));

vi.mock("@mealmind/db/repositories/recipes", () => repoMocks);

import { syncLegacyRecipeFiles } from "./recipe-bootstrap";

const originalRoot = process.env.MEALMIND_RECIPE_ROOT;
let temporaryRoot = "";

beforeEach(() => {
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mealmind-bootstrap-test-"));
  process.env.MEALMIND_RECIPE_ROOT = temporaryRoot;
  vi.clearAllMocks();
  repoMocks.getRecipeDocumentByRecipeId.mockResolvedValue(null);
  repoMocks.getRecipeDocumentBySourcePath.mockResolvedValue(null);
  repoMocks.upsertFileRecipeDocument.mockResolvedValue(null);
});

afterEach(() => {
  if (originalRoot === undefined) delete process.env.MEALMIND_RECIPE_ROOT;
  else process.env.MEALMIND_RECIPE_ROOT = originalRoot;
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

function validCooklang(id = "legacy-recipe") {
  return `---
id: ${id}
title: Legacy Recipe
servings: 2
mealTypes: [dinner]
---

Cook @rice{1%cup}.
`;
}

describe("legacy CookLang database synchronization", () => {
  it("imports valid files and retains invalid-file diagnostics", async () => {
    fs.writeFileSync(path.join(temporaryRoot, "valid.cook"), validCooklang());
    fs.writeFileSync(path.join(temporaryRoot, "invalid.cook"), "---\ntitle: Broken\n---\n\nNo recipe metadata.\n");

    const result = await syncLegacyRecipeFiles();

    expect(result).toEqual({ imported: 1, invalid: 1 });
    expect(repoMocks.upsertFileRecipeDocument).toHaveBeenCalledTimes(2);
    expect(repoMocks.upsertFileRecipeDocument).toHaveBeenCalledWith(expect.objectContaining({
      origin: "file",
      status: "valid",
      recipeId: "legacy-recipe",
      sourcePath: "valid.cook",
    }));
    expect(repoMocks.upsertFileRecipeDocument).toHaveBeenCalledWith(expect.objectContaining({
      origin: "file",
      status: "invalid",
      sourcePath: "invalid.cook",
      parseErrors: expect.any(Array),
    }));
  });

  it("does not overwrite a URL recipe when a legacy file reuses its ID", async () => {
    fs.writeFileSync(path.join(temporaryRoot, "same-id.cook"), validCooklang("imported-recipe"));
    repoMocks.getRecipeDocumentByRecipeId.mockResolvedValue({
      documentId: "url-document",
      recipeId: "imported-recipe",
      origin: "url",
    });

    const result = await syncLegacyRecipeFiles();

    expect(result).toEqual({ imported: 0, invalid: 1 });
    expect(repoMocks.upsertFileRecipeDocument).toHaveBeenCalledWith(expect.objectContaining({
      status: "invalid",
      sourcePath: "same-id.cook",
      parseErrors: [expect.stringContaining("already used by an imported recipe")],
    }));
  });
});
