import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { globSync } from "glob";
import { parseRecipeCooklang, type Recipe } from "@mealmind/domain";
import {
  getRecipeDocumentByRecipeId,
  getRecipeDocumentBySourcePath,
  upsertFileRecipeDocument,
} from "@mealmind/db/repositories/recipes";
import type { InsertRecipeDocument } from "@mealmind/db";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const imageContentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function recipeRoot() {
  return path.resolve(process.env.MEALMIND_RECIPE_ROOT || path.join(process.cwd(), "recipes"));
}

function contentHash(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function sourceUrl(recipe: Recipe) {
  const source = recipe.cooklang.metadata.source;
  return typeof source === "string" && source.trim() ? source.trim() : null;
}

function readImage(root: string, recipe: Recipe) {
  if (!recipe.image) return { imageBytes: null, imageContentType: null };
  const filePath = path.resolve(root, recipe.image);
  const relative = path.relative(root, filePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return { imageBytes: null, imageContentType: null };
  }
  const contentType = imageContentTypes[path.extname(filePath).toLowerCase()];
  if (!contentType || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return { imageBytes: null, imageContentType: null };
  }
  const stats = fs.statSync(filePath);
  if (stats.size === 0 || stats.size > MAX_IMAGE_BYTES) {
    return { imageBytes: null, imageContentType: null };
  }
  return { imageBytes: fs.readFileSync(filePath), imageContentType: contentType };
}

function invalidDocument(input: {
  documentId: string;
  sourcePath: string;
  content: string;
  errors: string[];
}): InsertRecipeDocument {
  const now = new Date().toISOString();
  return {
    documentId: input.documentId,
    recipeId: null,
    origin: "file",
    status: "invalid",
    sourceUrl: null,
    sourcePath: input.sourcePath,
    title: "",
    description: "",
    defaultServings: 2,
    suggestedSlots: [],
    tags: [],
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    cooklang: input.content,
    contentHash: contentHash(input.content),
    parseErrors: input.errors,
    imageBytes: null,
    imageContentType: null,
    createdAt: now,
    updatedAt: now,
  };
}

function validDocument(input: {
  documentId: string;
  sourcePath: string;
  content: string;
  recipe: Recipe;
  root: string;
}): InsertRecipeDocument {
  const now = new Date().toISOString();
  const image = readImage(input.root, input.recipe);
  return {
    documentId: input.documentId,
    recipeId: input.recipe.id,
    origin: "file",
    status: "valid",
    sourceUrl: sourceUrl(input.recipe),
    sourcePath: input.sourcePath,
    title: input.recipe.title,
    description: input.recipe.description,
    defaultServings: input.recipe.defaultServings,
    suggestedSlots: input.recipe.suggestedSlots,
    tags: input.recipe.tags,
    prepTimeMinutes: input.recipe.prepTimeMinutes ?? null,
    cookTimeMinutes: input.recipe.cookTimeMinutes ?? null,
    cooklang: input.content,
    contentHash: contentHash(input.content),
    parseErrors: [],
    imageBytes: image.imageBytes,
    imageContentType: image.imageContentType,
    createdAt: now,
    updatedAt: now,
  };
}

export async function syncLegacyRecipeFiles() {
  const root = recipeRoot();
  if (!fs.existsSync(root)) return { imported: 0, invalid: 0 };

  const files = globSync("**/*.cook", { cwd: root, absolute: true, nodir: true }).sort();
  const parsed = files.map((filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    const sourcePath = path.relative(root, filePath).replaceAll("\\", "/");
    try {
      return { filePath, sourcePath, content, recipe: parseRecipeCooklang(content, sourcePath), errors: [] as string[] };
    } catch (error) {
      return {
        filePath,
        sourcePath,
        content,
        recipe: null,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  });

  const ids = new Map<string, number>();
  for (const item of parsed) {
    if (item.recipe) ids.set(item.recipe.id, (ids.get(item.recipe.id) ?? 0) + 1);
  }

  let imported = 0;
  let invalid = 0;
  for (const item of parsed) {
    const existing = await (item.recipe ? getRecipeDocumentByRecipeId(item.recipe.id) : Promise.resolve(null));
    const existingByPath = await getRecipeDocumentBySourcePath(item.sourcePath);
    let document: InsertRecipeDocument;

    if (!item.recipe) {
      document = invalidDocument({
        documentId: existingByPath?.documentId ?? crypto.randomUUID(),
        sourcePath: item.sourcePath,
        content: item.content,
        errors: item.errors,
      });
      invalid += 1;
    } else if ((ids.get(item.recipe.id) ?? 0) > 1) {
      document = invalidDocument({
        documentId: existingByPath?.documentId ?? crypto.randomUUID(),
        sourcePath: item.sourcePath,
        content: item.content,
        errors: [`Duplicate recipe id "${item.recipe.id}". Recipe excluded from planning.`],
      });
      invalid += 1;
    } else if (existing && existing.origin === "url" && existingByPath?.documentId !== existing.documentId) {
      document = invalidDocument({
        documentId: existingByPath?.documentId ?? crypto.randomUUID(),
        sourcePath: item.sourcePath,
        content: item.content,
        errors: [`Recipe id "${item.recipe.id}" is already used by an imported recipe.`],
      });
      invalid += 1;
    } else {
      document = validDocument({
        documentId: existingByPath?.documentId ?? crypto.randomUUID(),
        sourcePath: item.sourcePath,
        content: item.content,
        recipe: item.recipe,
        root,
      });
      imported += 1;
    }

    await upsertFileRecipeDocument(document);
  }

  return { imported, invalid };
}
