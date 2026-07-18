import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import dns from "node:dns/promises";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { AppError, type RecipeImportJobDto, type RecipeImportJobStatus } from "@mealmind/contracts";
import { parseRecipeCooklang } from "@mealmind/domain";
import {
  claimNextRecipeImportJob,
  createCompletedRecipeImportJob,
  createRecipeImportJob,
  getActiveRecipeImportJob,
  getLatestRecipeImportJob,
  getRecipeDocumentByRecipeId,
  getRecipeDocumentBySourceUrl,
  getRecipeImportJob,
  listRecentRecipeImportJobs,
  requeueExpiredRecipeImportJobs,
  saveUrlRecipeDocumentAndComplete,
  updateRecipeImportJob,
  type RecipeDocument,
} from "@mealmind/db/repositories/recipes";

const execFileAsync = promisify(execFile);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const imageContentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function now() {
  return new Date().toISOString();
}

export function normalizeRecipeUrl(input: string) {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw new AppError("BAD_REQUEST", "Recipe URL is not valid.", 400);
  }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new AppError("BAD_REQUEST", "Recipe URL must be a public HTTP or HTTPS URL.", 400);
  }
  parsed.hash = "";
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();
  return parsed.toString();
}

function isPublicIpv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [first, second, third] = octets;
  if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && (second === 0 || second === 168)) return false;
  if (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100))) return false;
  if (first === 203 && second === 0 && third === 113) return false;
  return true;
}

function isPublicIp(address: string) {
  const family = net.isIP(address);
  if (family === 4) return isPublicIpv4(address);
  if (family !== 6) return false;
  const normalized = address.toLowerCase().split("%", 1)[0];
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    if (net.isIP(mapped) === 4) return isPublicIpv4(mapped);
  }
  return normalized !== "::"
    && normalized !== "::1"
    && !/^f[cd]/.test(normalized)
    && !/^fe[89ab]/.test(normalized)
    && !/^ff/.test(normalized)
    && !normalized.startsWith("2001:db8:");
}

async function assertPublicRecipeHost(sourceUrl: string) {
  const hostname = new URL(sourceUrl).hostname;
  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (error) {
    throw new AppError("BAD_REQUEST", "Recipe host could not be resolved.", 400, error instanceof Error ? error.message : undefined);
  }
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new AppError("BAD_REQUEST", "Recipe URL must point to a public host.", 400);
  }
}

function toDto(job: Awaited<ReturnType<typeof getRecipeImportJob>>): RecipeImportJobDto | null {
  if (!job) return null;
  return {
    id: job.id,
    sourceUrl: job.sourceUrl,
    status: job.status as RecipeImportJobStatus,
    recipeId: job.recipeId,
    recipeTitle: job.recipeTitle,
    error: job.error,
    deduplicated: job.deduplicated,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
  };
}

export async function getRecipeImportJobDto(id: string) {
  return toDto(await getRecipeImportJob(id));
}

export async function listRecipeImportJobDtos(limit = 10) {
  return (await listRecentRecipeImportJobs(limit)).map((job) => ({
    id: job.id,
    sourceUrl: job.sourceUrl,
    status: job.status as RecipeImportJobStatus,
    recipeId: job.recipeId,
    recipeTitle: job.recipeTitle,
    error: job.error,
    deduplicated: job.deduplicated,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
  }));
}

export async function enqueueRecipeImport(inputUrl: string) {
  const sourceUrl = normalizeRecipeUrl(inputUrl);
  await assertPublicRecipeHost(sourceUrl);
  const latest = await getLatestRecipeImportJob(sourceUrl);
  if (latest) return toDto(latest)!;
  const existingRecipe = await getRecipeDocumentBySourceUrl(sourceUrl);
  if (existingRecipe?.recipeId) {
    const completed = await createCompletedRecipeImportJob({
      id: crypto.randomUUID(),
      sourceUrl,
      recipeId: existingRecipe.recipeId,
      recipeTitle: existingRecipe.title,
      createdAt: now(),
    });
    return toDto(completed)!;
  }

  const active = await getActiveRecipeImportJob(sourceUrl);
  if (active) return toDto(active)!;

  try {
    return toDto(
      await createRecipeImportJob({
        id: crypto.randomUUID(),
        sourceUrl,
        createdAt: now(),
      }),
    )!;
  } catch (error) {
    const racedJob = await getActiveRecipeImportJob(sourceUrl);
    if (racedJob) return toDto(racedJob)!;
    throw error;
  }
}

function safeErrorMessage(error: unknown) {
  const stderr = typeof error === "object" && error && "stderr" in error ? String(error.stderr ?? "").trim() : "";
  if (stderr) return stderr.slice(-2000);
  return (error instanceof Error ? error.message : String(error)).slice(-2000);
}

function replaceFrontmatterField(content: string, field: string, value: string) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error("Generated CookLang is missing frontmatter.");
  const frontmatter = match[1].split(/\r?\n/);
  const fieldPattern = new RegExp(`^${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*.*$`);
  const index = frontmatter.findIndex((line) => fieldPattern.test(line));
  if (index < 0) throw new Error(`Generated CookLang is missing ${field} metadata.`);
  frontmatter[index] = `${field}: ${value}`;
  return `---\n${frontmatter.join("\n")}\n---\n${content.slice(match[0].length)}`;
}

function resolveTempPath(root: string, value: string) {
  const resolved = path.resolve(root, value);
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Importer returned a path outside its temporary directory.");
  }
  return resolved;
}

function parseJsonResult(stdout: string) {
  const line = stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .reverse()
    .find((value) => value.startsWith("{") && value.endsWith("}"));
  if (!line) throw new Error("Recipe importer did not return a result.");
  const result = JSON.parse(line) as { id?: string; title?: string; path?: string; image?: string };
  if (!result.id || !result.title || !result.path) throw new Error("Recipe importer returned an incomplete result.");
  return { id: result.id, title: result.title, path: result.path, image: result.image };
}

function readImportedImage(root: string, imagePath: string | undefined) {
  if (!imagePath) return { imageBytes: null, imageContentType: null };
  const filePath = resolveTempPath(root, imagePath);
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

async function runPythonImporter(sourceUrl: string) {
  const temporaryRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "mealmind-recipe-import-"));
  try {
    const scriptPath = process.env.MEALMIND_RECIPE_IMPORT_SCRIPT
      ? path.resolve(process.env.MEALMIND_RECIPE_IMPORT_SCRIPT)
      : path.resolve(process.cwd(), ".agents/skills/import-cooklang/scripts/import-recipe.py");
    const python = process.env.MEALMIND_RECIPE_IMPORT_PYTHON || "python";
    const { stdout } = await execFileAsync(
      python,
      [scriptPath, sourceUrl, temporaryRoot, "--json"],
      { timeout: 120_000, maxBuffer: 2 * 1024 * 1024 },
    );
    const result = parseJsonResult(stdout);
    const cooklangPath = resolveTempPath(temporaryRoot, result.path);
    let cooklang = await fs.promises.readFile(cooklangPath, "utf8");
    const image = readImportedImage(temporaryRoot, result.image);
    const baseRecipe = parseRecipeCooklang(cooklang, `database/${result.id}.cook`);
    let recipeId = baseRecipe.id;
    let existing = await getRecipeDocumentByRecipeId(recipeId);
    if (existing) {
      const suffix = createHash("sha256").update(sourceUrl).digest("hex").slice(0, 8);
      recipeId = `${recipeId}-${suffix}`;
      existing = await getRecipeDocumentByRecipeId(recipeId);
      let counter = 2;
      while (existing) {
        recipeId = `${baseRecipe.id}-${suffix}-${counter}`;
        existing = await getRecipeDocumentByRecipeId(recipeId);
        counter += 1;
      }
      cooklang = replaceFrontmatterField(cooklang, "id", recipeId);
      if (result.image) {
        cooklang = replaceFrontmatterField(cooklang, "image", `images/${recipeId}${path.extname(result.image)}`);
      }
    }
    const recipe = parseRecipeCooklang(cooklang, `database/${recipeId}.cook`);
    return {
      recipe,
      cooklang,
      image,
      contentHash: createHash("sha256").update(cooklang).digest("hex"),
    };
  } finally {
    await fs.promises.rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function processRecipeImportJob(job: Awaited<ReturnType<typeof claimNextRecipeImportJob>>) {
  if (!job) return;
  try {
    await updateRecipeImportJob(job.id, { status: "converting" });
    const imported = await runPythonImporter(job.sourceUrl);
    await updateRecipeImportJob(job.id, { status: "saving" });
    const document: RecipeDocument = {
      documentId: crypto.randomUUID(),
      recipeId: imported.recipe.id,
      origin: "url",
      status: "valid",
      sourceUrl: job.sourceUrl,
      sourcePath: null,
      title: imported.recipe.title,
      description: imported.recipe.description,
      defaultServings: imported.recipe.defaultServings,
      suggestedSlots: imported.recipe.suggestedSlots,
      tags: imported.recipe.tags,
      prepTimeMinutes: imported.recipe.prepTimeMinutes ?? null,
      cookTimeMinutes: imported.recipe.cookTimeMinutes ?? null,
      cooklang: imported.cooklang,
      contentHash: imported.contentHash,
      parseErrors: [],
      imageBytes: imported.image.imageBytes,
      imageContentType: imported.image.imageContentType,
      createdAt: now(),
      updatedAt: now(),
    };
    await saveUrlRecipeDocumentAndComplete({
      document,
      jobId: job.id,
      recipeId: imported.recipe.id,
      recipeTitle: imported.recipe.title,
    });
  } catch (error) {
    await updateRecipeImportJob(job.id, {
      status: "failed",
      error: safeErrorMessage(error),
      leaseUntil: null,
      completedAt: now(),
    });
  }
}

export function createRecipeImportService(logger: { error: (obj: unknown, message: string) => void }) {
  let started = false;
  let pumping = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  async function pump() {
    if (!started || pumping) return;
    pumping = true;
    try {
      while (started) {
        const job = await claimNextRecipeImportJob();
        if (!job) break;
        await processRecipeImportJob(job);
      }
    } catch (error) {
      logger.error({ err: error }, "Recipe import worker stopped after an unexpected error.");
    } finally {
      pumping = false;
    }
  }

  return {
    async start() {
      if (started) return;
      started = true;
      await requeueExpiredRecipeImportJobs();
      timer = setInterval(() => void pump(), 1000);
      void pump();
    },
    async trigger() {
      await pump();
    },
    async stop() {
      started = false;
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
