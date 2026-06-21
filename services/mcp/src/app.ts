import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type {
  ApiResponse,
  AppSummaryDto,
  PlanningStateDto,
  RecipeDto,
  RecipeListDto,
  ShoppingListDto,
  SettingsWithPantryDto,
} from "@helloqwen/contracts";

const API_BASE_URL = process.env.HELLOQWEN_API_BASE_URL ?? "http://127.0.0.1:3101";
const DOCS_ROOT = process.env.HELLOQWEN_DOCS_ROOT ?? path.join(process.cwd(), "docs");

/* ------------------------------------------------------------------ */
/*  HTTP helpers                                                      */
/* ------------------------------------------------------------------ */

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.ok) {
    throw new Error(body.error.message);
  }
  return body.data;
}

async function postJson<T, R>(path: string, body?: T): Promise<R> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  const payload = (await res.json()) as ApiResponse<R>;
  if (!payload.ok) {
    throw new Error(payload.error.message);
  }
  return payload.data;
}

async function patchJson<T, R>(path: string, body?: T): Promise<R> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  const payload = (await res.json()) as ApiResponse<R>;
  if (!payload.ok) {
    throw new Error(payload.error.message);
  }
  return payload.data;
}

/* ------------------------------------------------------------------ */
/*  Type aliases for MCP responses                                     */
/* ------------------------------------------------------------------ */

function jsonText(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function jsonResource(uri: URL | string, data: unknown) {
  const resourceUri = typeof uri === "string" ? uri : uri.href;
  return {
    contents: [
      {
        uri: resourceUri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function markdownResource(uri: URL | string, filePath: string) {
  const resourceUri = typeof uri === "string" ? uri : uri.href;
  return {
    contents: [
      {
        uri: resourceUri,
        mimeType: "text/markdown",
        text: fs.readFileSync(filePath, "utf8"),
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  Recipe helpers (API-backed)                                       */
/* ------------------------------------------------------------------ */

function summarizeRecipe(recipe: RecipeDto) {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    mealTypes: recipe.mealTypes,
    tags: recipe.tags,
    defaultServings: recipe.defaultServings,
    prepTimeMinutes: recipe.prepTimeMinutes ?? null,
    cookTimeMinutes: recipe.cookTimeMinutes ?? null,
    totalTimeMinutes: (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0),
    ingredientCount: recipe.ingredients.length,
    filePath: recipe.filePath,
    detailResource: `helloqwen://recipes/${recipe.id}`,
    appUrl: `/recipes/${recipe.id}`,
  };
}

function detailedRecipe(recipe: RecipeDto) {
  return {
    ...summarizeRecipe(recipe),
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  };
}

/* ------------------------------------------------------------------ */
/*  Planning helpers (API-backed)                                     */
/* ------------------------------------------------------------------ */

async function getCurrentPlanningState(): Promise<PlanningStateDto> {
  return getJson("/api/plans/current");
}

async function getCurrentShoppingList() {
  const state = await getCurrentPlanningState();
  const plan = state.activePlan ?? state.nextDraft;
  if (!plan) {
    return { plan: null, shoppingList: null };
  }
  const shoppingList = await getJson<ShoppingListDto | null>(`/api/plans/${encodeURIComponent(plan.id)}/shopping-list`);
  return {
    plan: {
      id: plan.id,
      weekStart: plan.weekStart,
      weekEnd: plan.weekEnd,
      status: plan.status,
    },
    shoppingList,
  };
}

/* ------------------------------------------------------------------ */
/*  Doc paths                                                         */
/* ------------------------------------------------------------------ */

const docPaths = {
  implementationPlan: path.join(DOCS_ROOT, "IMPLEMENTATION_PLAN.md"),
  handoff: path.join(DOCS_ROOT, "HANDOFF.md"),
  workLog: path.join(DOCS_ROOT, "WORK_LOG.md"),
};

/* ------------------------------------------------------------------ */
/*  Zod schemas for tool input parameters                              */
/* ------------------------------------------------------------------ */

const ListRecipesInputSchema = z.object({
  mealType: z.enum(["lunch", "dinner"]).optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
});

const GetRecipeInputSchema = z.object({
  recipeId: z.string().min(1),
});

const GetShoppingListInputSchema = z.object({
  planId: z.string().optional(),
});

const GenerateNextWeekPlanInputSchema = z.object({
  replaceExisting: z.boolean().default(false),
}).default({ replaceExisting: false });

const GenerateShoppingListInputSchema = z.object({
  planId: z.string().min(1),
});

const UpdateSlotServingsInputSchema = z.object({
  planId: z.string().min(1),
  slotId: z.string().min(1),
  servings: z.number().int().min(1).max(12),
});

const SwapSlotRecipeInputSchema = z.object({
  planId: z.string().min(1),
  slotId: z.string().min(1),
  mode: z.enum(["manual", "ai"]),
  recipeId: z.string().optional(),
  note: z.string().default(""),
});

const CommitPlanInputSchema = z.object({
  planId: z.string().min(1),
});

/* ------------------------------------------------------------------ */
/*  MCP server factory                                                */
/* ------------------------------------------------------------------ */

export function createHelloQwenMcpServer() {
  const server = new McpServer(
    {
      name: "helloqwen",
      version: "0.1.0",
    },
    {
      instructions:
        "Explore and operate the local HelloQwen meal-planning app. Read resources first; mutating tools create or modify state via the API service.",
    },
  );

  /* ---- Resources ---- */

  // App summary
  server.registerResource(
    "app-summary",
    "helloqwen://app/summary",
    {
      title: "HelloQwen App Summary",
      description: "High-level app state, settings, recipe count, and planning state.",
      mimeType: "application/json",
    },
    async (uri) => {
      const recipeList = await getJson<RecipeListDto>("/api/recipes");
      const settings = await getJson<SettingsWithPantryDto>("/api/settings");
      const planningState = await getCurrentPlanningState();
      return jsonResource(uri, {
        settings: settings.settings,
        pantryStaples: settings.pantryStaples,
        recipeCount: recipeList.count,
        invalidRecipeCount: recipeList.invalidRecipes.length,
        planningState,
      } satisfies AppSummaryDto);
    },
  );

  // Recipe catalog
  server.registerResource(
    "recipes",
    "helloqwen://recipes",
    {
      title: "Recipe Catalog",
      description: "Compact summaries of all valid Markdown recipes.",
      mimeType: "application/json",
    },
    async (uri) => {
      return jsonResource(uri, await getJson<RecipeListDto>("/api/recipes"));
    },
  );

  // Recipe detail
  server.registerResource(
    "recipe-detail",
    new ResourceTemplate("helloqwen://recipes/{recipeId}", {
      list: async () => ({
        resources: (await getJson<RecipeListDto>("/api/recipes")).recipes.map((recipe) => ({
          uri: `helloqwen://recipes/${recipe.id}`,
          name: recipe.id,
          title: recipe.title,
          description: recipe.description,
          mimeType: "application/json",
        })),
      }),
      complete: {
        recipeId: async (value) =>
          (await getJson<RecipeListDto>("/api/recipes")).recipes
            .map((recipe) => recipe.id)
            .filter((id) => id.startsWith(value)),
      },
    }),
    {
      title: "Recipe Detail",
      description: "Full recipe metadata, ingredients, and instructions by recipe id.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const recipe = await getJson<RecipeDto>(`/api/recipes/${encodeURIComponent(String(variables.recipeId))}`);
      if (!recipe) {
        throw new Error(`Recipe not found: ${variables.recipeId}`);
      }
      return jsonResource(uri, detailedRecipe(recipe));
    },
  );

  // Planning state
  server.registerResource(
    "planning-state",
    "helloqwen://plans/current",
    {
      title: "Current Planning State",
      description: "Active plan, next draft, and next-week range.",
      mimeType: "application/json",
    },
    async (uri) => jsonResource(uri, await getCurrentPlanningState()),
  );

  // Shopping current
  server.registerResource(
    "shopping-current",
    "helloqwen://shopping/current",
    {
      title: "Current Shopping List",
      description: "Shopping list for the active plan or upcoming draft plan.",
      mimeType: "application/json",
    },
    async (uri) => jsonResource(uri, await getCurrentShoppingList()),
  );

  // Docs resources
  server.registerResource(
    "implementation-plan",
    "helloqwen://docs/implementation-plan",
    {
      title: "Implementation Plan",
      description: "Repository implementation plan for HelloQwen.",
      mimeType: "text/markdown",
    },
    (uri) => markdownResource(uri, docPaths.implementationPlan),
  );

  server.registerResource(
    "handoff",
    "helloqwen://docs/handoff",
    {
      title: "Handoff",
      description: "Latest handoff notes for agents continuing work.",
      mimeType: "text/markdown",
    },
    (uri) => markdownResource(uri, docPaths.handoff),
  );

  server.registerResource(
    "work-log",
    "helloqwen://docs/work-log",
    {
      title: "Work Log",
      description: "Append-only implementation work log.",
      mimeType: "text/markdown",
    },
    (uri) => markdownResource(uri, docPaths.workLog),
  );

  /* ---- Tools ---- */

  // list_recipes
  server.registerTool(
    "list_recipes",
    {
      title: "List Recipes",
      description: "List valid recipes with optional meal type, tag, and text filters.",
      inputSchema: ListRecipesInputSchema,
    },
    async (args) => {
      const recipeList = await getJson<RecipeListDto>("/api/recipes");
      const filtered = recipeList.recipes.filter((recipe) => {
        if (args.mealType && !recipe.mealTypes.includes(args.mealType)) return false;
        const tag = (args.tag ?? "").trim().toLowerCase();
        if (tag && !recipe.tags.some((t: string) => t.toLowerCase() === tag)) return false;
        const search = (args.search ?? "").trim().toLowerCase();
        if (search) {
          const haystack = [recipe.title, recipe.description, recipe.id, ...recipe.tags].join(" ").toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      });
      return jsonText({
        recipes: filtered,
        invalidRecipes: recipeList.invalidRecipes,
        count: filtered.length,
      });
    },
  );

  // get_recipe
  server.registerTool(
    "get_recipe",
    {
      title: "Get Recipe",
      description: "Get full metadata, ingredients, and instructions for one recipe.",
      inputSchema: GetRecipeInputSchema,
    },
    async (args) => {
      const recipe = await getJson<RecipeDto>(`/api/recipes/${encodeURIComponent(args.recipeId)}`);
      if (!recipe) {
        throw new Error(`Recipe not found: ${args.recipeId}`);
      }
      return jsonText(detailedRecipe(recipe));
    },
  );

  // validate_recipe_library
  server.registerTool(
    "validate_recipe_library",
    {
      title: "Validate Recipe Library",
      description: "Return valid recipe summaries and invalid Markdown recipe errors.",
    },
    async () => {
      const recipeList = await getJson<RecipeListDto>("/api/recipes");
      return jsonText({
        validRecipes: recipeList.recipes,
        invalidRecipes: recipeList.invalidRecipes,
        validCount: recipeList.recipes.length,
        invalidCount: recipeList.invalidRecipes.length,
      });
    },
  );

  // get_planning_state
  server.registerTool(
    "get_planning_state",
    {
      title: "Get Planning State",
      description: "Return active plan, upcoming draft, and next-week range.",
    },
    async () => jsonText(await getCurrentPlanningState()),
  );

  // get_shopping_list
  server.registerTool(
    "get_shopping_list",
    {
      title: "Get Shopping List",
      description: "Return a shopping list by plan id, or the current active/draft shopping list when omitted.",
      inputSchema: GetShoppingListInputSchema,
    },
    async (args) => {
      const planId = args.planId;
      if (planId) {
        return jsonText({ planId, shoppingList: await getJson<ShoppingListDto | null>(`/api/plans/${encodeURIComponent(planId)}/shopping-list`) });
      }
      return jsonText(await getCurrentShoppingList());
    },
  );

  // generate_next_week_plan
  server.registerTool(
    "generate_next_week_plan",
    {
      title: "Generate Next Week Plan",
      description: "Generate or replace the next Monday-Sunday draft plan using local LM Studio/Qwen.",
      inputSchema: GenerateNextWeekPlanInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => jsonText(await postJson("/api/plans/generate", { replaceExisting: args.replaceExisting })),
  );

  // generate_shopping_list
  server.registerTool(
    "generate_shopping_list",
    {
      title: "Generate Shopping List",
      description: "Regenerate the shopping list for a plan using local LM Studio/Qwen.",
      inputSchema: GenerateShoppingListInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => jsonText(await postJson(`/api/plans/${encodeURIComponent(args.planId)}/shopping-list`)),
  );

  // update_slot_servings
  server.registerTool(
    "update_slot_servings",
    {
      title: "Update Slot Servings",
      description: "Update serving count for an editable draft meal slot.",
      inputSchema: UpdateSlotServingsInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      return jsonText(
        await patchJson(`/api/plans/${encodeURIComponent(args.planId)}/slots/${encodeURIComponent(args.slotId)}`, { servings: args.servings }),
      );
    },
  );

  // swap_slot_recipe
  server.registerTool(
    "swap_slot_recipe",
    {
      title: "Swap Slot Recipe",
      description: "Swap a recipe in an editable draft slot, manually or via local AI.",
      inputSchema: SwapSlotRecipeInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      return jsonText(
        await postJson(`/api/plans/${encodeURIComponent(args.planId)}/swap`, { slotId: args.slotId, mode: args.mode, recipeId: args.recipeId, note: args.note }),
      );
    },
  );

  // commit_plan
  server.registerTool(
    "commit_plan",
    {
      title: "Commit Plan",
      description: "Commit an editable draft plan, locking recipe and serving edits.",
      inputSchema: CommitPlanInputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async (args) => jsonText(await postJson(`/api/plans/${encodeURIComponent(args.planId)}/commit`)),
  );

  /* ---- Prompt ---- */

  server.registerPrompt(
    "explore_helloqwen",
    {
      title: "Explore HelloQwen",
      description: "Guide an agent through the useful read-only resources before taking actions.",
    },
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              "Explore HelloQwen before making changes.",
              "Start with helloqwen://app/summary, helloqwen://recipes, helloqwen://plans/current, and helloqwen://docs/handoff.",
              "Use read-only tools first: list_recipes, get_recipe, validate_recipe_library, get_planning_state, and get_shopping_list.",
              "Only call mutating tools when explicitly asked.",
            ].join("\n"),
          },
        },
      ],
    }),
  );

  return server;
}
