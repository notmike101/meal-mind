import { createHash } from "node:crypto";
import { mealSwapMessages, mealSwapSchema, runJsonPrompt, weeklyPlanDraftSchema, weeklyPlanMessages } from "@mealmind/ai";
import { AppError } from "@mealmind/contracts";
import {
  addDays,
  formatDateInTimeZone,
  getCurrentWeekRange,
  getNextWeekRange,
  isDateWithinRange,
  isPlanLocked,
  normalizeMealSlot,
  validatePlannedMealsForWeek,
  validateServingCount,
  type Recipe,
  type WeekRange,
} from "@mealmind/domain";
import {
  applyLazyLocks,
  createPlanWithMeals,
  deletePlanMeal,
  getAllPlans,
  getMealsByIds,
  getMostRecentDraft,
  getPlanByWeekStart,
  getPlansOverlapping,
  getPlanWithMeals,
  insertPlanMeal,
  replaceMealRecipe,
  replacePlanWithMeals,
  updateMealStatus,
  updatePlanMeal,
  updatePlanSkippedDates,
  updatePlanStatus,
} from "@mealmind/db/repositories/plans";
import { getSettings, getSettingsWithPantry } from "@mealmind/db/repositories/settings";
import { createAiEvent } from "@mealmind/db/repositories/ai-events";
import { generateShoppingList } from "./shopping.js";
import { getAvailableRecipes, getRecipeCatalog } from "../recipes.js";

function hashPrompt(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function getRecipeLookup(recipes: Recipe[]) {
  return new Map(recipes.map((recipe) => [recipe.id, recipe]));
}

function validateRecipeSelections(
  meals: Array<{ date: string; slot?: string | null; recipeId: string }>,
  recipes: Recipe[],
  week: WeekRange,
  expectedCount: number,
) {
  const errors = validatePlannedMealsForWeek(meals, week, expectedCount);
  const recipesById = getRecipeLookup(recipes);
  for (const meal of meals) {
    if (!recipesById.has(meal.recipeId)) errors.push(`${meal.date} references unknown recipe "${meal.recipeId}".`);
  }
  return errors;
}

function resolveWeek(weekStart: string | undefined, timezone: string): WeekRange {
  return weekStart
    ? { weekStart, weekEnd: addDays(weekStart, 6) }
    : getNextWeekRange(new Date(), timezone);
}

function assertFuturePlanningWeek(weekStart: string, timezone: string) {
  const currentWeekStart = getCurrentWeekRange(new Date(), timezone).weekStart;
  if (weekStart <= currentWeekStart) {
    throw new AppError("CONFLICT", "Meal plans can only be generated for future weeks.", 409);
  }
}

function assertEditablePlan<T extends { status: "draft" | "committed" | "active" | "completed" }>(plan: T | null): asserts plan is T {
  if (!plan) throw new AppError("NOT_FOUND", "Meal plan not found.", 404);
  if (isPlanLocked(plan)) throw new AppError("CONFLICT", "This meal plan is locked.", 409);
}

async function refreshShoppingList(planId: string) {
  try {
    await generateShoppingList(planId);
  } catch {
    // Meal changes remain valid when local AI shopping generation is temporarily unavailable.
  }
}

export async function getCurrentPlanningState() {
  const { settings } = await getSettingsWithPantry();
  await applyLazyLocks(new Date(), settings.timezone);
  const today = formatDateInTimeZone(new Date(), settings.timezone);
  const currentRange = await getPlansOverlapping({ weekStart: today, weekEnd: today });
  const currentWeek = getCurrentWeekRange(new Date(), settings.timezone);
  const nextWeek = getNextWeekRange(new Date(), settings.timezone);
  const nextDraft = (await getPlanByWeekStart(nextWeek.weekStart)) ?? (await getMostRecentDraft());
  return {
    activePlan: currentRange.find((plan) => plan.status === "active" || plan.status === "committed") ?? null,
    nextDraft,
    currentWeek,
    nextWeek,
  };
}

export async function getPlanSummaries() {
  const settings = await getSettings();
  await applyLazyLocks(new Date(), settings.timezone);
  return (await getAllPlans()).map((plan) => ({
    id: plan.id,
    weekStart: plan.weekStart,
    weekEnd: plan.weekEnd,
    status: plan.status,
    creationSource: plan.creationSource,
    commitSource: plan.commitSource,
    committedAt: plan.committedAt,
    createdAt: plan.createdAt,
    mealCount: plan.meals.length,
  }));
}

export async function getPlanForWeek(weekStart: string) {
  const settings = await getSettings();
  await applyLazyLocks(new Date(), settings.timezone);
  return getPlanByWeekStart(weekStart);
}

export async function createBlankPlan(input: { weekStart?: string }) {
  const settings = await getSettings();
  const week = resolveWeek(input.weekStart, settings.timezone);
  const existing = await getPlanByWeekStart(week.weekStart);
  if (existing) {
    throw new AppError("CONFLICT", "A plan already exists for that week.", 409, { planId: existing.id });
  }
  const now = new Date().toISOString();
  return createPlanWithMeals({
    id: crypto.randomUUID(),
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    status: "draft",
    creationSource: "manual",
    commitSource: null,
    committedAt: null,
    createdAt: now,
    aiModel: null,
    aiBaseUrl: null,
    aiPromptHash: null,
    skippedDates: [],
  }, []);
}

export async function generateWeeklyPlan(input: { weekStart?: string; replaceExisting?: boolean; mealCount?: number }) {
  const settings = await getSettings();
  const mealCount = input.mealCount ?? settings.defaultWeeklyMealCount;
  if (!Number.isSafeInteger(mealCount) || mealCount < 1) {
    throw new AppError("BAD_REQUEST", "Meal count must be a positive integer.", 400);
  }

  const resolvedWeek = resolveWeek(input.weekStart, settings.timezone);
  assertFuturePlanningWeek(resolvedWeek.weekStart, settings.timezone);
  const existing = await getPlanByWeekStart(resolvedWeek.weekStart);
  if (existing && !input.replaceExisting) {
    throw new AppError("CONFLICT", "A plan already exists for that week.", 409, { planId: existing.id });
  }
  if (existing && isPlanLocked(existing)) {
    throw new AppError("CONFLICT", "A locked plan cannot be replaced.", 409);
  }

  const { recipes, invalidRecipes } = await getRecipeCatalog();
  if (recipes.length === 0) {
    throw new AppError("BAD_REQUEST", "No valid recipes are available for planning.", 400, { invalidRecipes });
  }

  let validationErrors: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const messages = weeklyPlanMessages({ settings, week: resolvedWeek, recipes, mealCount, validationErrors });
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
    if (!draft) continue;

    validationErrors = validateRecipeSelections(draft.meals, recipes, resolvedWeek, mealCount);
    if (validationErrors.length > 0) continue;

    const recipesById = getRecipeLookup(recipes);
    const planId = crypto.randomUUID();
    const now = new Date().toISOString();
    const plan = {
      id: planId,
      weekStart: resolvedWeek.weekStart,
      weekEnd: resolvedWeek.weekEnd,
      status: "draft" as const,
      creationSource: "ai" as const,
      commitSource: null,
      committedAt: null,
      createdAt: now,
      aiModel: settings.aiModel,
      aiBaseUrl: settings.aiBaseUrl,
      aiPromptHash: hashPrompt({ messages, draft }),
      skippedDates: [],
    };
    const positions = new Map<string, number>();
    const meals = draft.meals.map((meal) => {
      const recipe = recipesById.get(meal.recipeId);
      if (!recipe) throw new AppError("AI_VALIDATION_FAILED", `Unknown recipe ${meal.recipeId}.`, 502);
      const sortOrder = positions.get(meal.date) ?? 0;
      positions.set(meal.date, sortOrder + 1);
      return {
        id: crypto.randomUUID(),
        planId,
        date: meal.date,
        slot: normalizeMealSlot(meal.slot),
        recipeId: recipe.id,
        recipeTitleSnapshot: recipe.title,
        servings: settings.defaultMealServings,
        status: "planned" as const,
        swapCount: 0,
        notes: meal.reason,
        sortOrder,
      };
    });
    assertFuturePlanningWeek(resolvedWeek.weekStart, settings.timezone);
    const saved = existing
      ? await replacePlanWithMeals(existing.id, plan, meals)
      : await createPlanWithMeals(plan, meals);
    if (!saved) {
      throw new AppError(
        "CONFLICT",
        "The draft changed while regeneration was running. Refresh and try again.",
        409,
      );
    }
    await refreshShoppingList(saved.id);
    return getPlanWithMeals(saved.id);
  }

  throw new AppError("AI_VALIDATION_FAILED", "AI meal plan failed validation after retry.", 502, { validationErrors });
}

export async function commitPlan(planId: string) {
  const plan = await getPlanWithMeals(planId);
  if (!plan) throw new AppError("NOT_FOUND", "Meal plan not found.", 404);
  if (isPlanLocked(plan)) return plan;
  return updatePlanStatus(planId, "committed", "manual");
}

export async function addMeal(input: {
  planId: string;
  date: string;
  slot?: string | null;
  recipeId: string;
  servings?: unknown;
  notes?: string;
}) {
  const [settings, plan] = await Promise.all([getSettings(), getPlanWithMeals(input.planId)]);
  assertEditablePlan(plan);
  if (!isDateWithinRange(input.date, plan)) {
    throw new AppError("BAD_REQUEST", "Meal date must be within the plan week.", 400);
  }
  const recipe = (await getAvailableRecipes()).find((candidate) => candidate.id === input.recipeId);
  if (!recipe) throw new AppError("BAD_REQUEST", "Selected recipe is not available in the library.", 400);
  const slot = normalizeMealSlot(input.slot);
  if ((slot?.length ?? 0) > 50) throw new AppError("BAD_REQUEST", "Meal slot labels must be 50 characters or fewer.", 400);
  const sortOrder = Math.max(-1, ...plan.meals.filter((meal) => meal.date === input.date).map((meal) => meal.sortOrder)) + 1;
  const updated = await insertPlanMeal({
    id: crypto.randomUUID(),
    planId: plan.id,
    date: input.date,
    slot,
    recipeId: recipe.id,
    recipeTitleSnapshot: recipe.title,
    servings: input.servings === undefined ? settings.defaultMealServings : validateServingCount(input.servings),
    status: "planned",
    swapCount: 0,
    notes: input.notes ?? "",
    sortOrder,
  });
  await refreshShoppingList(plan.id);
  return updated;
}

export async function updateMeal(input: {
  planId: string;
  mealId: string;
  date?: string;
  slot?: string | null;
  servings?: unknown;
  notes?: string;
}) {
  const plan = await getPlanWithMeals(input.planId);
  assertEditablePlan(plan);
  if (!plan.meals.some((meal) => meal.id === input.mealId)) {
    throw new AppError("NOT_FOUND", "Meal not found.", 404);
  }
  if (input.date !== undefined && !isDateWithinRange(input.date, plan)) {
    throw new AppError("BAD_REQUEST", "Meal date must be within the plan week.", 400);
  }
  const slot = input.slot === undefined ? undefined : normalizeMealSlot(input.slot);
  if ((slot?.length ?? 0) > 50) throw new AppError("BAD_REQUEST", "Meal slot labels must be 50 characters or fewer.", 400);
  const updated = await updatePlanMeal({
    planId: input.planId,
    mealId: input.mealId,
    date: input.date,
    slot,
    servings: input.servings === undefined ? undefined : validateServingCount(input.servings),
    notes: input.notes,
  });
  if (input.servings !== undefined) await refreshShoppingList(input.planId);
  return updated;
}

export async function removeMeal(planId: string, mealId: string) {
  const plan = await getPlanWithMeals(planId);
  assertEditablePlan(plan);
  if (!plan.meals.some((meal) => meal.id === mealId)) throw new AppError("NOT_FOUND", "Meal not found.", 404);
  const updated = await deletePlanMeal(planId, mealId);
  await refreshShoppingList(planId);
  return updated;
}

export async function updateSkippedDay(input: { planId: string; date: string; skipped: boolean }) {
  const plan = await getPlanWithMeals(input.planId);
  assertEditablePlan(plan);
  if (!isDateWithinRange(input.date, plan)) {
    throw new AppError("BAD_REQUEST", "Skipped date must be within the plan week.", 400);
  }

  const skippedDates = new Set(plan.skippedDates);
  if (input.skipped) skippedDates.add(input.date);
  else skippedDates.delete(input.date);
  if (skippedDates.size >= 7) {
    throw new AppError("BAD_REQUEST", "At least one day must remain in the meal plan.", 400);
  }

  const updated = await updatePlanSkippedDates(input.planId, [...skippedDates].sort());
  await refreshShoppingList(input.planId);
  return updated;
}

export async function swapMeal(input: {
  planId: string;
  mealId: string;
  mode: "ai" | "manual";
  recipeId?: string;
  note?: string;
}) {
  const settings = await getSettings();
  const plan = await getPlanWithMeals(input.planId);
  assertEditablePlan(plan);
  const meal = plan.meals.find((candidate) => candidate.id === input.mealId);
  if (!meal) throw new AppError("NOT_FOUND", "Meal not found.", 404);

  const recipes = await getAvailableRecipes();
  let selectedRecipeId = input.recipeId;
  let note = input.note;
  if (input.mode === "ai") {
    let validationErrors: string[] = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const messages = mealSwapMessages({
        settings,
        recipes,
        date: meal.date,
        slot: meal.slot,
        currentRecipeId: meal.recipeId,
        note: input.note,
        validationErrors,
      });
      const swap = await runJsonPrompt({
        eventType: "slot_swap",
        settings,
        system: messages.system,
        user: messages.user,
        schema: mealSwapSchema,
        logEvent: createAiEvent,
      }).catch((error: unknown) => {
        if (error instanceof AppError && error.code === "AI_VALIDATION_FAILED" && attempt === 0) {
          validationErrors = ["The prior response did not match the required JSON schema."];
          return null;
        }
        throw error;
      });
      if (!swap) continue;
      selectedRecipeId = swap.recipeId;
      note = swap.reason;
      validationErrors = recipes.some((recipe) => recipe.id === selectedRecipeId)
        ? []
        : [`Recipe "${selectedRecipeId}" is not available.`];
      if (validationErrors.length === 0) break;
    }
    if (validationErrors.length > 0) {
      throw new AppError("AI_VALIDATION_FAILED", "AI swap failed validation after retry.", 502, { validationErrors });
    }
  }

  const recipe = recipes.find((candidate) => candidate.id === selectedRecipeId);
  if (!recipe) throw new AppError("BAD_REQUEST", "Selected recipe is not available in the library.", 400);
  const updated = await replaceMealRecipe({
    planId: input.planId,
    mealId: input.mealId,
    recipeId: recipe.id,
    recipeTitleSnapshot: recipe.title,
    notes: note,
  });
  await refreshShoppingList(input.planId);
  return updated;
}

export async function updateAdherence(input: { mealId: string; status: "planned" | "done" | "skipped" }) {
  const meal = (await getMealsByIds([input.mealId]))[0];
  if (!meal) throw new AppError("NOT_FOUND", "Meal not found.", 404);
  const plan = await getPlanWithMeals(meal.planId);
  if (!plan) throw new AppError("NOT_FOUND", "Meal plan not found.", 404);
  if (plan.status === "draft") {
    throw new AppError("CONFLICT", "Adherence can only be tracked after a plan is committed or active.", 409);
  }
  const updated = await updateMealStatus(input.mealId, input.status);
  if (!updated) throw new AppError("NOT_FOUND", "Meal not found.", 404);
  return updated;
}
