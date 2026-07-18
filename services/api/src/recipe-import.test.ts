import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimNextRecipeImportJob: vi.fn(),
  createCompletedRecipeImportJob: vi.fn(),
  createRecipeImportJob: vi.fn(),
  getActiveRecipeImportJob: vi.fn(),
  getLatestRecipeImportJob: vi.fn(),
  getRecipeDocumentByRecipeId: vi.fn(),
  getRecipeDocumentBySourceUrl: vi.fn(),
  getRecipeImportJob: vi.fn(),
  listRecentRecipeImportJobs: vi.fn(),
  requeueExpiredRecipeImportJobs: vi.fn(),
  saveUrlRecipeDocumentAndComplete: vi.fn(),
  updateRecipeImportJob: vi.fn(),
  lookup: vi.fn(),
}));

vi.mock("@mealmind/db/repositories/recipes", () => mocks);
vi.mock("node:dns/promises", () => ({ default: { lookup: mocks.lookup } }));

import {
  createRecipeImportService,
  enqueueRecipeImport,
  normalizeRecipeUrl,
} from "./recipe-import";

const queuedJob = {
  id: "job-1",
  sourceUrl: "https://example.com/recipe",
  status: "fetching" as const,
  recipeId: null,
  recipeTitle: null,
  error: null,
  deduplicated: false,
  attempts: 1,
  leaseUntil: "2026-07-15T00:05:00.000Z",
  createdAt: "2026-07-15T00:00:00.000Z",
  updatedAt: "2026-07-15T00:00:00.000Z",
  completedAt: null,
};

function resetMocks() {
  vi.clearAllMocks();
  mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  mocks.getLatestRecipeImportJob.mockResolvedValue(null);
  mocks.getRecipeDocumentBySourceUrl.mockResolvedValue(null);
  mocks.getActiveRecipeImportJob.mockResolvedValue(null);
  mocks.createRecipeImportJob.mockResolvedValue({ ...queuedJob, status: "queued" });
  mocks.getRecipeImportJob.mockResolvedValue(null);
  mocks.requeueExpiredRecipeImportJobs.mockResolvedValue(undefined);
  mocks.updateRecipeImportJob.mockResolvedValue(null);
}

describe("recipe import URL and queue behavior", () => {
  it("normalizes source URLs and removes fragments", () => {
    expect(normalizeRecipeUrl(" HTTPS://Example.com/recipe#instructions ")).toBe("https://example.com/recipe");
    expect(() => normalizeRecipeUrl("file:///recipe.cook")).toThrow("HTTP or HTTPS");
    expect(() => normalizeRecipeUrl("https://user:pass@example.com/recipe")).toThrow("public HTTP or HTTPS");
  });

  it("rejects private DNS targets before creating a job", async () => {
    resetMocks();
    mocks.lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);

    await expect(enqueueRecipeImport("http://localhost:8080/recipe")).rejects.toThrow("public host");
    expect(mocks.createRecipeImportJob).not.toHaveBeenCalled();
  });

  it("returns the existing normalized job for duplicate URLs", async () => {
    resetMocks();
    const existing = { ...queuedJob, status: "queued" as const };
    mocks.getLatestRecipeImportJob.mockResolvedValue(existing);

    await expect(enqueueRecipeImport("https://EXAMPLE.com/recipe#top")).resolves.toMatchObject({ id: "job-1" });
    expect(mocks.createRecipeImportJob).not.toHaveBeenCalled();
  });

  it("returns a completed deduplication job for a legacy URL record", async () => {
    resetMocks();
    mocks.getRecipeDocumentBySourceUrl.mockResolvedValue({ recipeId: "legacy-recipe", title: "Legacy Recipe" });
    mocks.createCompletedRecipeImportJob.mockResolvedValue({
      ...queuedJob,
      status: "succeeded",
      recipeId: "legacy-recipe",
      recipeTitle: "Legacy Recipe",
      deduplicated: true,
    });

    await expect(enqueueRecipeImport("https://example.com/recipe")).resolves.toMatchObject({
      status: "succeeded",
      deduplicated: true,
      recipeId: "legacy-recipe",
    });
  });
});

describe("recipe import worker", () => {
  it("transitions a job, saves the validated CookLang atomically, and cleans its temp directory", async () => {
    resetMocks();
    let claimCount = 0;
    mocks.claimNextRecipeImportJob.mockImplementation(async () => {
      claimCount += 1;
      return claimCount === 1 ? queuedJob : null;
    });
    mocks.getRecipeDocumentByRecipeId.mockResolvedValue(null);
    mocks.saveUrlRecipeDocumentAndComplete.mockResolvedValue({ ...queuedJob, status: "succeeded" });
    const harnessRoot = fs.mkdtempSync(path.join(process.env.TEMP || process.cwd(), "mealmind-import-test-"));
    const scriptPath = path.join(harnessRoot, "fake-importer.py");
    const markerPath = path.join(harnessRoot, "temporary-root.txt");
    fs.writeFileSync(scriptPath, `import json
import pathlib
import sys

temporary_root = pathlib.Path(sys.argv[2])
pathlib.Path(${JSON.stringify(markerPath)}).write_text(str(temporary_root), encoding="utf-8")
cooklang_path = temporary_root / "pasta.cook"
cooklang_path.write_text("""---
id: pasta
title: Weeknight Pasta
servings: 2
mealTypes: [dinner]
source: https://example.com/recipe
---

Cook @pasta{1%cup}.
""", encoding="utf-8")
print(json.dumps({"id": "pasta", "title": "Weeknight Pasta", "path": str(cooklang_path)}))
`, "utf8");

    const logger = { error: vi.fn() };
    const service = createRecipeImportService(logger);
    let temporaryRoot = "";
    const previousScript = process.env.MEALMIND_RECIPE_IMPORT_SCRIPT;
    const previousPython = process.env.MEALMIND_RECIPE_IMPORT_PYTHON;
    process.env.MEALMIND_RECIPE_IMPORT_SCRIPT = scriptPath;
    process.env.MEALMIND_RECIPE_IMPORT_PYTHON = process.platform === "win32" ? "python" : "python3";
    try {
      await service.start();
      await vi.waitFor(() => {
        if (mocks.saveUrlRecipeDocumentAndComplete.mock.calls.length === 0) {
          throw new Error(JSON.stringify({
            claims: mocks.claimNextRecipeImportJob.mock.calls.length,
            updates: mocks.updateRecipeImportJob.mock.calls,
            errors: logger.error.mock.calls,
          }));
        }
      });
      temporaryRoot = fs.readFileSync(markerPath, "utf8");
    } finally {
      await service.stop();
      if (previousScript === undefined) delete process.env.MEALMIND_RECIPE_IMPORT_SCRIPT;
      else process.env.MEALMIND_RECIPE_IMPORT_SCRIPT = previousScript;
      if (previousPython === undefined) delete process.env.MEALMIND_RECIPE_IMPORT_PYTHON;
      else process.env.MEALMIND_RECIPE_IMPORT_PYTHON = previousPython;
      fs.rmSync(harnessRoot, { recursive: true, force: true });
    }

    expect(mocks.updateRecipeImportJob).toHaveBeenCalledWith("job-1", { status: "converting" });
    expect(mocks.updateRecipeImportJob).toHaveBeenCalledWith("job-1", { status: "saving" });
    expect(mocks.saveUrlRecipeDocumentAndComplete).toHaveBeenCalledWith(expect.objectContaining({
      jobId: "job-1",
      recipeId: "pasta",
      recipeTitle: "Weeknight Pasta",
      document: expect.objectContaining({ origin: "url", sourceUrl: queuedJob.sourceUrl, recipeId: "pasta" }),
    }));
    expect(temporaryRoot).not.toBe("");
    expect(fs.existsSync(temporaryRoot)).toBe(false);
  });
});
