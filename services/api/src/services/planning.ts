import { createHash } from "node:crypto";
import { runJsonPrompt, slotSwapMessages, slotSwapSchema, weeklyPlanDraftSchema, weeklyPlanMessages } from "@mealmind/ai";
import { AppError } from "@mealmind/contracts";
import {
  addDays,
  formatDateInTimeZone,
  getNextWeekRange,
  isPlanLocked,
  loadRecipes,
  validatePlannedSlotsForWeek,
  validateServingCount,
  type MealType,
  type Recipe,
  type WeekRange,
} from "@mealmind/domain";
import {
  applyLazyLocks,
  createPlanWithSlots,
  getMostRecentDraft,
  getPlanByWeekStart,
  getPlanWithSlots,
  getPlansOverlapping,
  getSlotsByIds,
  replacePlanWithSlots,
  replaceSlotRecipe,
  updateSlotStatus,
  updatePlanStatus,
  updatePlanSkippedDates,
  updateSlotServing,
} from "@mealmind/db/repositories/plans";
import { getSettings, getSettingsWithPantry } from "@mealmind/db/repositories/settings";
import { createAiEvent } from "@mealmind/db/repositories/ai-events";
import { generateShoppingList } from "./shopping.js";

function hashPrompt(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function getRecipeLookup(recipes: Recipe[]) {
  return new Map(recipes.map((recipe) => [recipe.id, recipe]));
}

function validateRecipeSelections(
  slots: Array<{ date: string; mealType: MealType; recipeId: string }>,
  recipes: Recipe[],
  week: WeekRange,
) {
  const errors = validatePlannedSlotsForWeek(slots, week);
  const recipesById = getRecipeLookup(recipes);

  for (const slot of slots) {
     const recipe = recipesById.get(slot.recipeId);
     if (!recipe) {
       errors.push(`${slot.date} ${slot.mealType} references unknown recipe "${slot.recipeId}".`);
       continue;
     }
   }

   return errors;
}

export async function getCurrentPlanningState() {
  const { settings } = await getSettingsWithPantry();
  await applyLazyLocks(new Date(), settings.timezone);
  const today = formatDateInTimeZone(new Date(), settings.timezone);
  const currentRange = await getPlansOverlapping({ weekStart: today, weekEnd: today });
  const nextWeek = getNextWeekRange(new Date(), settings.timezone);
  const nextDraft = (await getPlanByWeekStart(nextWeek.weekStart)) ?? (await getMostRecentDraft());

  return {
    activePlan:
      currentRange.find((plan) => plan.status === "active" || plan.status === "committed") ?? null,
    nextDraft,
    nextWeek,
  };
}

export async function generateWeeklyPlan(input: { weekStart?: string; replaceExisting?: boolean }) {
  const settings = await getSettings();
  const { recipes, invalidRecipes } = loadRecipes();
  if (recipes.length === 0) {
    throw new AppError("BAD_REQUEST", "No valid recipes are available for planning.", 400, {
      invalidRecipes,
    });
  }

  const resolvedWeek: WeekRange = input.weekStart
    ? { weekStart: input.weekStart, weekEnd: addDays(input.weekStart, 6) }
    : getNextWeekRange(new Date(), settings.timezone);

  const existing = await getPlanByWeekStart(resolvedWeek.weekStart);
  if (existing && !input.replaceExisting) {
    throw new AppError("CONFLICT", "A plan already exists for that week.", 409, {
      planId: existing.id,
    });
  }
  if (existing && isPlanLocked(existing)) {
    throw new AppError("CONFLICT", "A locked plan cannot be replaced.", 409);
  }

  let validationErrors: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const messages = weeklyPlanMessages({
      settings,
      week: resolvedWeek,
      recipes,
      validationErrors,
    });
    const draft = await runJsonPrompt({
      eventType: "plan_generate",
      settings,
      system: messages.system,
      user: messages.user,
      schema: weeklyPlanDraftSchema,
      logEvent: createAiEvent,
    }).catch((error: unknown) => {
      if (error instanceof AppError && error.code === "AI_VALIDATION_FAILED" && attempt === 0) {
        validationErrors = ["The prior response did not match the required JSON schema."];
        return null;
      }
      throw error;
    });

    if (!draft) {
      continue;
    }

    validationErrors = validateRecipeSelections(draft.slots, recipes, resolvedWeek);
    if (validationErrors.length > 0) {
      continue;
    }

    const recipesById = getRecipeLookup(recipes);
    const planId = crypto.randomUUID();
    const now = new Date().toISOString();
    const plan = {
      id: planId,
      weekStart: resolvedWeek.weekStart,
      weekEnd: resolvedWeek.weekEnd,
      status: "draft" as const,
      commitSource: null,
      committedAt: null,
      generatedAt: now,
      aiModel: settings.aiModel,
      aiBaseUrl: settings.aiBaseUrl,
      aiPromptHash: hashPrompt({ messages, draft }),
      skippedDates: [],
    };

    const slots = draft.slots.map((slot) => {
      const recipe = recipesById.get(slot.recipeId);
      if (!recipe) {
        throw new AppError("AI_VALIDATION_FAILED", `Unknown recipe ${slot.recipeId}.`, 502);
      }

      return {
        id: crypto.randomUUID(),
        planId,
        date: slot.date,
        mealType: slot.mealType,
        recipeId: recipe.id,
        recipeTitleSnapshot: recipe.title,
        servings:
          slot.mealType === "lunch"
            ? settings.defaultLunchServings
            : settings.defaultDinnerServings,
        status: "planned" as const,
        swapCount: 0,
        notes: slot.reason,
      };
    });

    const saved = existing
      ? await replacePlanWithSlots(plan, slots)
      : await createPlanWithSlots(plan, slots);

    try {
      await generateShoppingList(saved.id);
    } catch {
      // Shopping-list generation is retryable; keep the valid meal plan.
    }

    return getPlanWithSlots(saved.id);
  }

  throw new AppError("AI_VALIDATION_FAILED", "AI meal plan failed validation after retry.", 502, {
    validationErrors,
  });
}

export async function commitPlan(planId: string) {
  const plan = await getPlanWithSlots(planId);
  if (!plan) {
    throw new AppError("NOT_FOUND", "Meal plan not found.", 404);
  }
  if (isPlanLocked(plan)) {
    return plan;
  }
  return updatePlanStatus(planId, "committed", "manual");
}

export async function updateSlot(input: { planId: string; slotId: string; servings?: unknown; notes?: string }) {
  const servings = input.servings === undefined ? undefined : validateServingCount(input.servings);
  const plan = await getPlanWithSlots(input.planId);
  if (!plan) {
    throw new AppError("NOT_FOUND", "Meal plan not found.", 404);
  }
  if (isPlanLocked(plan)) {
    throw new AppError("CONFLICT", "This meal plan is locked.", 409);
  }

  const slot = plan.slots.find((candidate) => candidate.id === input.slotId);
  if (!slot) {
    throw new AppError("NOT_FOUND", "Meal slot not found.", 404);
  }

  return updateSlotServing(input.planId, input.slotId, servings ?? slot.servings, input.notes);
}

export async function updateSkippedDay(input: { planId: string; date: string; skipped: boolean }) {
  const plan = await getPlanWithSlots(input.planId);
  if (!plan) {
    throw new AppError("NOT_FOUND", "Meal plan not found.", 404);
  }
  if (isPlanLocked(plan)) {
    throw new AppError("CONFLICT", "This meal plan is locked.", 409);
  }
  if (input.date < plan.weekStart || input.date > plan.weekEnd) {
    throw new AppError("BAD_REQUEST", "Skipped date must be within the plan week.", 400);
  }

  const skippedDates = new Set(plan.skippedDates);
  if (input.skipped) skippedDates.add(input.date);
  else skippedDates.delete(input.date);

  if (skippedDates.size >= 7) {
    throw new AppError("BAD_REQUEST", "At least one day must remain in the meal plan.", 400);
  }

  return updatePlanSkippedDates(input.planId, [...skippedDates].sort());
}

export async function swapSlot(input: {
  planId: string;
  slotId: string;
  mode: "ai" | "manual";
  recipeId?: string;
  note?: string;
}) {
  const settings = await getSettings();
  const plan = await getPlanWithSlots(input.planId);
  if (!plan) {
    throw new AppError("NOT_FOUND", "Meal plan not found.", 404);
  }
  if (isPlanLocked(plan)) {
    throw new AppError("CONFLICT", "This meal plan is locked.", 409);
  }

  const slot = plan.slots.find((candidate) => candidate.id === input.slotId);
  if (!slot) {
    throw new AppError("NOT_FOUND", "Meal slot not found.", 404);
  }

  const recipesList = loadRecipes().recipes;
   let selectedRecipeId = input.recipeId;
   let note = input.note;

   if (input.mode === "ai") {
     let validationErrors: string[] = [];
     for (let attempt = 0; attempt < 2; attempt += 1) {
       const messages = slotSwapMessages({
         settings,
         recipes: recipesList,
         date: slot.date,
         mealType: slot.mealType,
         currentRecipeId: slot.recipeId,
         note: input.note,
         validationErrors,
       });
       const swap = await runJsonPrompt({
         eventType: "slot_swap",
         settings,
         system: messages.system,
         user: messages.user,
         schema: slotSwapSchema,
         logEvent: createAiEvent,
       }).catch((error: unknown) => {
         if (error instanceof AppError && error.code === "AI_VALIDATION_FAILED" && attempt === 0) {
           validationErrors = ["The prior response did not match the required JSON schema."];
           return null;
         }
         throw error;
       });
       if (!swap) {
         continue;
       }
       selectedRecipeId = swap.recipeId;
       note = swap.reason;
       const selected = recipesList.find((recipe) => recipe.id === selectedRecipeId);
       validationErrors = selected ? [] : [`Recipe "${selectedRecipeId}" is not available.`];
       if (validationErrors.length === 0) {
         break;
       }
     }
     if (validationErrors.length > 0) {
       throw new AppError("AI_VALIDATION_FAILED", "AI swap failed validation after retry.", 502, {
         validationErrors,
       });
     }
   }

   const recipe = recipesList.find((candidate) => candidate.id === selectedRecipeId);
  if (!recipe) {
    throw new AppError("BAD_REQUEST", "Selected recipe is not available in the library.", 400);
  }

  const updated = await replaceSlotRecipe({
    planId: input.planId,
    slotId: input.slotId,
    recipeId: recipe.id,
    recipeTitleSnapshot: recipe.title,
    notes: note,
  });

  try {
    await generateShoppingList(input.planId);
  } catch {
    // Shopping-list generation is retryable.
  }

  return updated;
}

export async function updateAdherence(input: { slotId: string; status: "planned" | "done" | "skipped" }) {
  const slot = (await getSlotsByIds([input.slotId]))[0];
  if (!slot) {
    throw new AppError("NOT_FOUND", "Meal slot not found.", 404);
  }

  const existingPlan = await getPlanWithSlots(slot.planId);
  if (!existingPlan) {
    throw new AppError("NOT_FOUND", "Meal plan not found.", 404);
  }

  if (existingPlan.status === "draft") {
    throw new AppError("CONFLICT", "Adherence can only be tracked after a plan is committed or active.", 409);
  }

  const plan = await updateSlotStatus(input.slotId, input.status);
  if (!plan) {
    throw new AppError("NOT_FOUND", "Meal slot not found.", 404);
  }

  return plan;
}
