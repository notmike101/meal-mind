import type { FastifyInstance, FastifyReply } from "fastify";
import { createReadStream } from "node:fs";
import {
  adherenceRequestSchema,
  fail,
  generatePlanRequestSchema,
  ok,
  recipeFilterRequestSchema,
  settingsUpdateRequestSchema,
  swapSlotRequestSchema,
  toAppError,
  updateShoppingItemRequestSchema,
  updateSlotRequestSchema,
} from "@mealmind/contracts";
import { testAiConnectivity } from "@mealmind/ai";
import { createAiEvent } from "@mealmind/db/repositories/ai-events";
import { getSettings, getSettingsWithPantry, updateSettings } from "@mealmind/db/repositories/settings";
import { updateShoppingItemChecked } from "@mealmind/db/repositories/shopping";
import {
  commitPlan,
  generateWeeklyPlan,
  getCurrentPlanningState,
  swapSlot,
  updateAdherence,
  updateSlot,
} from "./services/planning.js";
import { generateShoppingList, getShoppingList } from "./services/shopping.js";
import { getRecipeDetail, getRecipeImage, listRecipes } from "./recipes.js";

type RouteDependencies = {
  triggerAutomaticPlanning?: () => void | Promise<void>;
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
    return ok(listRecipes(query));
  });

  app.get<{ Params: { recipeId: string } }>("/api/recipes/:recipeId", async (request, reply) => {
    const recipe = getRecipeDetail(request.params.recipeId);
    if (!recipe) {
      return reply.status(404).send(fail("NOT_FOUND", "Recipe not found."));
    }
    return ok(recipe);
  });

  app.get<{ Params: { recipeId: string } }>("/api/recipes/:recipeId/image", async (request, reply) => {
    const image = getRecipeImage(request.params.recipeId);
    if (!image) {
      return reply.status(404).send(fail("NOT_FOUND", "Recipe image not found."));
    }
    return reply
      .header("Content-Type", image.contentType)
      .header("Cache-Control", "public, max-age=86400")
      .send(createReadStream(image.filePath));
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
      return ok(await testAiConnectivity(await getSettings(), createAiEvent));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/plans/current", async () => ok(await getCurrentPlanningState()));

  app.post("/api/plans/generate", async (request, reply) => {
    try {
      const body = generatePlanRequestSchema.parse(request.body ?? {});
      return ok(await generateWeeklyPlan(body));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch<{ Params: { planId: string; slotId: string } }>(
    "/api/plans/:planId/slots/:slotId",
    async (request, reply) => {
      try {
        const body = updateSlotRequestSchema.parse(request.body ?? {});
        const plan = await updateSlot({ planId: request.params.planId, slotId: request.params.slotId, ...body });
        try {
          await generateShoppingList(request.params.planId);
        } catch {
          // Keep the slot update; shopping generation can be retried.
        }
        return ok(plan);
      } catch (error) {
        return sendError(reply, error);
      }
    },
  );

  app.post<{ Params: { planId: string } }>("/api/plans/:planId/swap", async (request, reply) => {
    try {
      const body = swapSlotRequestSchema.parse(request.body ?? {});
      return ok(await swapSlot({ planId: request.params.planId, ...body }));
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
