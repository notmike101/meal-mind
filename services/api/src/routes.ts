import type { FastifyInstance, FastifyReply } from "fastify";
import {
  adherenceRequestSchema,
  aiModelsRequestSchema,
  createMealRequestSchema,
  createPlanRequestSchema,
  fail,
  generatePlanRequestSchema,
  ok,
  recipeFilterRequestSchema,
  recipeDetailRequestSchema,
  recipeImportListRequestSchema,
  recipeImportRequestSchema,
  settingsUpdateRequestSchema,
  swapMealRequestSchema,
  toAppError,
  updateShoppingItemRequestSchema,
  updateMealRequestSchema,
  updateSkippedDayRequestSchema,
} from "@mealmind/contracts";
import { testAiConnectivity } from "@mealmind/ai";
import { createAiEvent } from "@mealmind/db/repositories/ai-events";
import { getSettings, getSettingsWithPantry, updateSettings } from "@mealmind/db/repositories/settings";
import { updateShoppingItemChecked } from "@mealmind/db/repositories/shopping";
import {
  commitPlan,
  createBlankPlan,
  addMeal,
  removeMeal,
  generateWeeklyPlan,
  getCurrentPlanningState,
  swapMeal,
  updateAdherence,
  updateMeal,
  updateSkippedDay,
} from "./services/planning.js";
import { generateShoppingList, getShoppingList } from "./services/shopping.js";
import { getRecipeDetail, getRecipeImage, listRecipes } from "./recipes.js";
import {
  enqueueRecipeImport,
  getRecipeImportJobDto,
  listRecipeImportJobDtos,
} from "./recipe-import.js";

type RouteDependencies = {
  triggerAutomaticPlanning?: () => void | Promise<void>;
  triggerRecipeImport?: () => void | Promise<void>;
};

function sendError(reply: FastifyReply, error: unknown) {
  const appError = toAppError(error);
  return reply.status(appError.status).send(fail(appError.code, appError.message, appError.details));
}

export function registerRoutes(app: FastifyInstance, dependencies: RouteDependencies = {}) {
  app.get("/healthz", async () => ok({ status: "ok" }));
  app.get("/readyz", async () => ok({ status: "ready" }));

  app.get("/api/recipes", async (request) => {
    const query = recipeFilterRequestSchema.parse(request.query ?? {});
    return ok(await listRecipes(query));
  });

  app.post("/api/recipes/imports", async (request, reply) => {
    const parsed = recipeImportRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send(fail("BAD_REQUEST", parsed.error.issues[0]?.message ?? "Recipe URL is invalid."));
    }
    try {
      const job = await enqueueRecipeImport(parsed.data.url);
      void Promise.resolve(dependencies.triggerRecipeImport?.()).catch((error) => {
        app.log.error({ err: error }, "Could not trigger the recipe import worker.");
      });
      return reply.status(202).send(ok(job));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get<{ Params: { jobId: string } }>("/api/recipes/imports/:jobId", async (request, reply) => {
    const job = await getRecipeImportJobDto(request.params.jobId);
    if (!job) return reply.status(404).send(fail("NOT_FOUND", "Recipe import job not found."));
    return ok(job);
  });

  app.get("/api/recipes/imports", async (request) => {
    const query = recipeImportListRequestSchema.parse(request.query ?? {});
    return ok(await listRecipeImportJobDtos(query.limit));
  });

  app.get<{ Params: { recipeId: string }; Querystring: { servings?: string } }>("/api/recipes/:recipeId", async (request, reply) => {
    const query = recipeDetailRequestSchema.parse(request.query ?? {});
    const recipe = await getRecipeDetail(request.params.recipeId, query.servings);
    if (!recipe) {
      return reply.status(404).send(fail("NOT_FOUND", "Recipe not found."));
    }
    return ok(recipe);
  });

  app.get<{ Params: { recipeId: string } }>("/api/recipes/:recipeId/image", async (request, reply) => {
    const image = await getRecipeImage(request.params.recipeId);
    if (!image) {
      return reply.status(404).send(fail("NOT_FOUND", "Recipe image not found."));
    }
    return reply
      .header("Content-Type", image.contentType)
      .header("Cache-Control", "public, max-age=86400")
      .send(image.data);
  });

  app.get("/api/settings", async () => ok(await getSettingsWithPantry()));

  app.patch("/api/settings", async (request, reply) => {
    try {
      const body = settingsUpdateRequestSchema.parse(request.body ?? {});
      const updated = await updateSettings(body);
      if (body.autoGenerateNextWeek === true && dependencies.triggerAutomaticPlanning) {
        void Promise.resolve(dependencies.triggerAutomaticPlanning()).catch((error) => {
          app.log.warn({ err: error }, "Could not trigger automatic meal plan generation after settings update.");
        });
      }
      return ok(updated);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/settings/test-ai", async (request, reply) => {
    try {
      const body = aiModelsRequestSchema.parse(request.body ?? {});
      const settings = await getSettings();
      return ok(await testAiConnectivity({ ...settings, aiBaseUrl: body.aiBaseUrl }, createAiEvent));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/plans/current", async () => ok(await getCurrentPlanningState()));

  app.post("/api/plans", async (request, reply) => {
    try {
      return ok(await createBlankPlan(createPlanRequestSchema.parse(request.body ?? {})));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/plans/generate", async (request, reply) => {
    try {
      const body = generatePlanRequestSchema.parse(request.body ?? {});
      return ok(await generateWeeklyPlan(body));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post<{ Params: { planId: string } }>("/api/plans/:planId/meals", async (request, reply) => {
    try {
      const body = createMealRequestSchema.parse(request.body ?? {});
      return ok(await addMeal({ planId: request.params.planId, ...body }));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch<{ Params: { planId: string; mealId: string } }>(
    "/api/plans/:planId/meals/:mealId",
    async (request, reply) => {
      try {
        const body = updateMealRequestSchema.parse(request.body ?? {});
        return ok(await updateMeal({ planId: request.params.planId, mealId: request.params.mealId, ...body }));
      } catch (error) {
        return sendError(reply, error);
      }
    },
  );

  app.delete<{ Params: { planId: string; mealId: string } }>("/api/plans/:planId/meals/:mealId", async (request, reply) => {
    try {
      return ok(await removeMeal(request.params.planId, request.params.mealId));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch<{ Params: { planId: string } }>("/api/plans/:planId/skipped-days", async (request, reply) => {
    try {
      const body = updateSkippedDayRequestSchema.parse(request.body ?? {});
      return ok(await updateSkippedDay({ planId: request.params.planId, ...body }));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post<{ Params: { planId: string; mealId: string } }>("/api/plans/:planId/meals/:mealId/swap", async (request, reply) => {
    try {
      const body = swapMealRequestSchema.parse(request.body ?? {});
      return ok(await swapMeal({ planId: request.params.planId, mealId: request.params.mealId, ...body }));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post<{ Params: { planId: string } }>("/api/plans/:planId/commit", async (request, reply) => {
    try {
      return ok(await commitPlan(request.params.planId));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get<{ Params: { planId: string } }>("/api/plans/:planId/shopping-list", async (request) =>
    ok(await getShoppingList(request.params.planId)),
  );

  app.post<{ Params: { planId: string } }>("/api/plans/:planId/shopping-list", async (request, reply) => {
    try {
      return ok(await generateShoppingList(request.params.planId));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch<{ Params: { itemId: string } }>("/api/shopping/items/:itemId", async (request, reply) => {
    try {
      const body = updateShoppingItemRequestSchema.parse(request.body ?? {});
      return ok(await updateShoppingItemChecked(request.params.itemId, body.checked));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/api/adherence", async (request, reply) => {
    try {
      const body = adherenceRequestSchema.parse(request.body ?? {});
      return ok(await updateAdherence(body));
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
