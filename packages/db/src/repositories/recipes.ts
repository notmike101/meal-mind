import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import { getDb, getPool } from "../client.js";
import {
  recipeDocuments,
  recipeImportJobs,
  type InsertRecipeDocument,
  type RecipeDocument,
  type RecipeImportJob,
} from "../schema.js";

const ACTIVE_IMPORT_STATUSES = ["queued", "fetching", "converting", "saving"] as const;

export async function listRecipeDocuments() {
  return getDb()
    .select()
    .from(recipeDocuments)
    .where(eq(recipeDocuments.status, "valid"))
    .orderBy(asc(recipeDocuments.title));
}

export async function listInvalidRecipeDocuments() {
  return getDb()
    .select()
    .from(recipeDocuments)
    .where(eq(recipeDocuments.status, "invalid"))
    .orderBy(asc(recipeDocuments.sourcePath), asc(recipeDocuments.documentId));
}

export async function getRecipeDocumentByRecipeId(recipeId: string) {
  return (
    await getDb()
      .select()
      .from(recipeDocuments)
      .where(and(eq(recipeDocuments.recipeId, recipeId), eq(recipeDocuments.status, "valid")))
      .limit(1)
  )[0] ?? null;
}

export async function getRecipeDocumentBySourceUrl(sourceUrl: string) {
  return (
    await getDb()
      .select()
      .from(recipeDocuments)
      .where(and(eq(recipeDocuments.sourceUrl, sourceUrl), eq(recipeDocuments.status, "valid")))
      .limit(1)
  )[0] ?? null;
}

export async function getRecipeDocumentBySourcePath(sourcePath: string) {
  return (
    await getDb()
      .select()
      .from(recipeDocuments)
      .where(and(eq(recipeDocuments.sourcePath, sourcePath), eq(recipeDocuments.origin, "file")))
      .limit(1)
  )[0] ?? null;
}

export async function getRecipeImageRecord(recipeId: string) {
  return (
    await getDb()
      .select({ imageBytes: recipeDocuments.imageBytes, imageContentType: recipeDocuments.imageContentType })
      .from(recipeDocuments)
      .where(and(eq(recipeDocuments.recipeId, recipeId), eq(recipeDocuments.status, "valid")))
      .limit(1)
  )[0] ?? null;
}

export async function upsertFileRecipeDocument(input: InsertRecipeDocument) {
  const existing = input.sourcePath ? await getRecipeDocumentBySourcePath(input.sourcePath) : null;
  if (existing) {
    const { documentId, ...updates } = input;
    void documentId;
    await getDb()
      .update(recipeDocuments)
      .set(updates)
      .where(eq(recipeDocuments.documentId, existing.documentId));
    return getRecipeDocumentBySourcePath(input.sourcePath!);
  }

  await getDb().insert(recipeDocuments).values(input);
  return getRecipeDocumentBySourcePath(input.sourcePath!);
}

export async function insertUrlRecipeDocument(document: InsertRecipeDocument) {
  await getDb().insert(recipeDocuments).values(document);
  return getRecipeDocumentByRecipeId(document.recipeId!);
}

export async function createRecipeImportJob(input: {
  id: string;
  sourceUrl: string;
  createdAt: string;
}) {
  await getDb().insert(recipeImportJobs).values({
    id: input.id,
    sourceUrl: input.sourceUrl,
    status: "queued",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  });
  return getRecipeImportJob(input.id);
}

export async function createCompletedRecipeImportJob(input: {
  id: string;
  sourceUrl: string;
  recipeId: string;
  recipeTitle: string;
  createdAt: string;
}) {
  await getDb().insert(recipeImportJobs).values({
    id: input.id,
    sourceUrl: input.sourceUrl,
    status: "succeeded",
    recipeId: input.recipeId,
    recipeTitle: input.recipeTitle,
    deduplicated: true,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    completedAt: input.createdAt,
  });
  return getRecipeImportJob(input.id);
}

export async function getRecipeImportJob(id: string) {
  return (await getDb().select().from(recipeImportJobs).where(eq(recipeImportJobs.id, id)).limit(1))[0] ?? null;
}

export async function getActiveRecipeImportJob(sourceUrl: string) {
  return (
    await getDb()
      .select()
      .from(recipeImportJobs)
      .where(and(eq(recipeImportJobs.sourceUrl, sourceUrl), inArray(recipeImportJobs.status, [...ACTIVE_IMPORT_STATUSES])))
      .limit(1)
  )[0] ?? null;
}

export async function getLatestRecipeImportJob(sourceUrl: string) {
  return (
    await getDb()
      .select()
      .from(recipeImportJobs)
      .where(eq(recipeImportJobs.sourceUrl, sourceUrl))
      .orderBy(desc(recipeImportJobs.createdAt))
      .limit(1)
  )[0] ?? null;
}

export async function listRecentRecipeImportJobs(limit = 10) {
  return getDb()
    .select()
    .from(recipeImportJobs)
    .orderBy(desc(recipeImportJobs.createdAt))
    .limit(Math.max(1, Math.min(50, limit)));
}

export async function requeueExpiredRecipeImportJobs(now = new Date().toISOString()) {
  await getDb()
    .update(recipeImportJobs)
    .set({ status: "queued", leaseUntil: null, updatedAt: now })
    .where(and(lt(recipeImportJobs.leaseUntil, now), inArray(recipeImportJobs.status, [...ACTIVE_IMPORT_STATUSES])));
}

export async function claimNextRecipeImportJob(now = new Date()) {
  const leaseUntil = new Date(now.getTime() + 5 * 60_000).toISOString();
  const result = await getPool().query(
    `
      UPDATE recipe_import_jobs
      SET status = 'fetching',
          attempts = attempts + 1,
          lease_until = $1,
          updated_at = $2
      WHERE id = (
        SELECT id
        FROM recipe_import_jobs
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `,
    [leaseUntil, now.toISOString()],
  );
  return result.rows[0] ? mapRecipeImportJobRow(result.rows[0]) : null;
}

export async function updateRecipeImportJob(
  id: string,
  input: {
    status?: RecipeImportJob["status"];
    recipeId?: string | null;
    recipeTitle?: string | null;
    error?: string | null;
    deduplicated?: boolean;
    leaseUntil?: string | null;
    completedAt?: string | null;
  },
) {
  const now = new Date().toISOString();
  await getDb()
    .update(recipeImportJobs)
    .set({ ...input, updatedAt: now })
    .where(eq(recipeImportJobs.id, id));
  return getRecipeImportJob(id);
}

export async function saveUrlRecipeDocumentAndComplete(input: {
  document: InsertRecipeDocument;
  jobId: string;
  recipeId: string;
  recipeTitle: string;
}) {
  const now = new Date().toISOString();
  await getDb().transaction(async (tx) => {
    await tx.insert(recipeDocuments).values(input.document);
    await tx
      .update(recipeImportJobs)
      .set({
        status: "succeeded",
        recipeId: input.recipeId,
        recipeTitle: input.recipeTitle,
        error: null,
        leaseUntil: null,
        updatedAt: now,
        completedAt: now,
      })
      .where(eq(recipeImportJobs.id, input.jobId));
  });
  return getRecipeImportJob(input.jobId);
}

export function mapRecipeImportJobRow(row: Record<string, unknown>): RecipeImportJob {
  return {
    id: String(row.id),
    sourceUrl: String(row.source_url),
    status: String(row.status) as RecipeImportJob["status"],
    recipeId: row.recipe_id ? String(row.recipe_id) : null,
    recipeTitle: row.recipe_title ? String(row.recipe_title) : null,
    error: row.error ? String(row.error) : null,
    deduplicated: Boolean(row.deduplicated),
    attempts: Number(row.attempts ?? 0),
    leaseUntil: row.lease_until ? String(row.lease_until) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

export function isActiveRecipeImportStatus(status: RecipeImportJob["status"]) {
  return (ACTIVE_IMPORT_STATUSES as readonly string[]).includes(status);
}

export type RecipeDocumentRow = RecipeDocument;
export type { RecipeDocument };
