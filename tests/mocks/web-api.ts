import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import {
  fail,
  ok,
  type MealDto,
  type MealPlanDto,
  type MealPlanSummaryDto,
  type PublicSettingsDto,
  type RecipeDto,
  type RecipeListDto,
  type RecipeSummaryDto,
  type SettingsWithPantryDto,
  type ShoppingItemDto,
  type ShoppingListDto,
} from "@mealmind/contracts";
import { addDays, formatDateInTimeZone, getCurrentWeekRange, getNextWeekRange } from "@mealmind/domain";

export type MockScenario = "default" | "missing-shopping-list" | "no-current-plan";

type MockWeeks = {
  current: string;
  next: string;
  pastEmpty: string;
  futureEmpty: string;
  missingList: string;
};

type MockState = {
  scenario: MockScenario;
  timezone: string;
  weeks: MockWeeks;
  today: string;
  sequence: number;
  timestampBase: number;
  settings: SettingsWithPantryDto;
  recipes: RecipeDto[];
  plans: MealPlanDto[];
  shoppingLists: Record<string, ShoppingListDto>;
};

const timezone = "America/Chicago";
let state: MockState;

function nextId(prefix: string) {
  state.sequence += 1;
  return `${prefix}-${state.sequence}`;
}

function nextTimestamp() {
  state.sequence += 1;
  return new Date(state.timestampBase + state.sequence * 1_000).toISOString();
}

function recipeSummary(recipe: RecipeDto): RecipeSummaryDto {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    imageUrl: recipe.imageUrl,
    sourceUrl: recipe.sourceUrl,
    format: recipe.format,
    defaultServings: recipe.defaultServings,
    suggestedSlots: recipe.suggestedSlots,
    tags: recipe.tags,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    filePath: recipe.filePath,
    totalTimeMinutes: (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0),
    ingredientCount: recipe.cooklang.ingredients.length,
    cookwareCount: recipe.cooklang.cookware.length,
    timerCount: recipe.cooklang.timers.length,
    detailResource: `mealmind://recipes/${recipe.id}`,
    appUrl: `/recipes/${recipe.id}`,
  };
}

function makeRecipe(input: {
  id: string;
  title: string;
  description: string;
  tags: string[];
  ingredients: string[];
  instruction: string;
}): RecipeDto {
  return {
    id: input.id,
    title: input.title,
    description: input.description,
    imageUrl: null,
    sourceUrl: `https://example.test/recipes/${input.id}`,
    format: "cooklang",
    defaultServings: 2,
    suggestedSlots: ["Dinner"],
    tags: input.tags,
    prepTimeMinutes: 10,
    cookTimeMinutes: 25,
    filePath: null,
    ingredients: input.ingredients,
    instructions: input.instruction,
    cooklang: {
      metadata: { title: input.title, servings: 2 },
      ingredients: input.ingredients.map((ingredient) => ({
        name: ingredient,
        alias: null,
        note: null,
        quantity: null,
        displayText: ingredient,
        stepNumbers: [1],
      })),
      cookware: [],
      timers: [],
      sections: [{
        name: null,
        content: [{
          type: "step",
          step: {
            number: 1,
            text: input.instruction,
            tokens: [{ type: "text", text: input.instruction }],
          },
        }],
      }],
    },
  };
}

function makeMeal(planId: string, date: string, index: number, recipe: RecipeDto, status: MealDto["status"] = "planned"): MealDto {
  return {
    id: `${planId}-meal-${index + 1}`,
    planId,
    date,
    slot: index % 2 === 0 ? "Dinner" : "Lunch",
    recipeId: recipe.id,
    recipeTitleSnapshot: recipe.title,
    servings: 2,
    status,
    swapCount: 0,
    notes: "Deterministic mock meal",
    sortOrder: index,
  };
}

function makePlan(input: {
  id: string;
  weekStart: string;
  status: MealPlanDto["status"];
  recipes: RecipeDto[];
  mealDates: string[];
  creationSource?: MealPlanDto["creationSource"];
}): MealPlanDto {
  const createdAt = `${input.weekStart}T12:00:00.000Z`;
  return {
    id: input.id,
    weekStart: input.weekStart,
    weekEnd: addDays(input.weekStart, 6),
    status: input.status,
    creationSource: input.creationSource ?? "manual",
    commitSource: input.status === "draft" ? null : "manual",
    committedAt: input.status === "draft" ? null : createdAt,
    createdAt,
    aiModel: input.creationSource === "ai" ? "mock-planner" : null,
    aiBaseUrl: input.creationSource === "ai" ? "http://127.0.0.1:3199/v1" : null,
    aiPromptHash: input.creationSource === "ai" ? "mock-prompt" : null,
    skippedDates: [],
    meals: input.mealDates.map((date, index) => makeMeal(input.id, date, index, input.recipes[index % input.recipes.length]!)),
  };
}

function makeShoppingList(plan: MealPlanDto): ShoppingListDto {
  const createdAt = nextTimestamp();
  const items = plan.meals.slice(0, Math.max(1, Math.min(plan.meals.length, 4))).map((meal, index): ShoppingItemDto => ({
    id: `${plan.id}-item-${index + 1}`,
    shoppingListId: `${plan.id}-shopping`,
    category: index % 2 === 0 ? "Produce" : "Pantry",
    name: index % 2 === 0 ? `${meal.recipeTitleSnapshot} vegetables` : `${meal.recipeTitleSnapshot} staples`,
    quantityText: `${index + 1} package${index === 0 ? "" : "s"}`,
    normalizedName: `${meal.recipeId}-${index}`,
    checked: false,
    sourceRecipeIds: JSON.stringify([meal.recipeId]),
    sortOrder: index,
  }));
  return {
    id: `${plan.id}-shopping`,
    planId: plan.id,
    createdAt,
    updatedAt: createdAt,
    aiModel: "mock-shopping",
    items,
  };
}

function createState(scenario: MockScenario): MockState {
  const currentWeek = getCurrentWeekRange(new Date(), timezone);
  const nextWeek = getNextWeekRange(new Date(), timezone);
  const weeks: MockWeeks = {
    current: currentWeek.weekStart,
    next: nextWeek.weekStart,
    pastEmpty: addDays(currentWeek.weekStart, -7),
    missingList: addDays(currentWeek.weekStart, 14),
    futureEmpty: addDays(currentWeek.weekStart, 21),
  };
  const today = formatDateInTimeZone(new Date(), timezone);
  const timestampBase = new Date(`${currentWeek.weekStart}T12:00:00.000Z`).valueOf();
  const recipes = [
    makeRecipe({
      id: "citrus-chicken-bowls",
      title: "Citrus Chicken Bowls",
      description: "Bright chicken bowls with roasted vegetables and lime rice.",
      tags: ["weeknight", "chicken"],
      ingredients: ["chicken breast", "lime", "rice"],
      instruction: "Roast the vegetables, cook the chicken, and serve everything over lime rice.",
    }),
    makeRecipe({
      id: "tomato-basil-pasta",
      title: "Tomato Basil Pasta",
      description: "A quick tomato pasta finished with basil and parmesan.",
      tags: ["vegetarian", "quick"],
      ingredients: ["pasta", "tomatoes", "basil"],
      instruction: "Boil the pasta, simmer the tomato sauce, and finish with fresh basil.",
    }),
    makeRecipe({
      id: "black-bean-tacos",
      title: "Black Bean Tacos",
      description: "Crisp tacos with seasoned beans, cabbage, and avocado.",
      tags: ["vegetarian", "tacos"],
      ingredients: ["black beans", "tortillas", "avocado"],
      instruction: "Warm the beans and tortillas, then assemble the tacos with cabbage and avocado.",
    }),
  ];
  const currentPlan = makePlan({
    id: `plan-${weeks.current}`,
    weekStart: weeks.current,
    status: "active",
    recipes,
    mealDates: [today, addDays(weeks.current, 2), addDays(weeks.current, 4)],
  });
  const nextPlan = makePlan({
    id: `plan-${weeks.next}`,
    weekStart: weeks.next,
    status: "draft",
    recipes,
    mealDates: [weeks.next, addDays(weeks.next, 2)],
    creationSource: "ai",
  });
  const missingListPlan = makePlan({
    id: `plan-${weeks.missingList}`,
    weekStart: weeks.missingList,
    status: "draft",
    recipes,
    mealDates: [weeks.missingList],
  });
  const publicSettings: PublicSettingsDto = {
    id: 1,
    timezone,
    aiBaseUrl: "http://127.0.0.1:3199/v1",
    aiModel: "mock-planner",
    planningPreferences: "Prefer practical weeknight meals.",
    planningVarietyRules: "Vary proteins and cuisines.",
    defaultMealServings: 2,
    defaultWeeklyMealCount: 7,
    autoGenerateNextWeek: true,
    createdAt: new Date(timestampBase).toISOString(),
    updatedAt: new Date(timestampBase).toISOString(),
    aiAuthConfigured: false,
  };
  const plans = scenario === "no-current-plan"
    ? [nextPlan, missingListPlan]
    : [currentPlan, nextPlan, missingListPlan];
  const initialState: MockState = {
    scenario,
    timezone,
    weeks,
    today,
    sequence: 0,
    timestampBase,
    settings: {
      settings: publicSettings,
      pantryStaples: [{ id: 1, name: "salt", normalizedName: "salt" }],
    },
    recipes,
    plans,
    shoppingLists: {},
  };
  state = initialState;
  if (scenario !== "no-current-plan" && scenario !== "missing-shopping-list") {
    initialState.shoppingLists[currentPlan.id] = makeShoppingList(currentPlan);
  }
  initialState.shoppingLists[nextPlan.id] = makeShoppingList(nextPlan);
  return initialState;
}

function planSummary(plan: MealPlanDto): MealPlanSummaryDto {
  return {
    id: plan.id,
    weekStart: plan.weekStart,
    weekEnd: plan.weekEnd,
    status: plan.status,
    creationSource: plan.creationSource,
    commitSource: plan.commitSource,
    committedAt: plan.committedAt,
    createdAt: plan.createdAt,
    mealCount: plan.meals.length,
  };
}

function planById(planId: string) {
  return state.plans.find((plan) => plan.id === planId) ?? null;
}

function editablePlan(reply: FastifyReply, planId: string) {
  const plan = planById(planId);
  if (!plan) {
    reply.status(404).send(fail("NOT_FOUND", "Meal plan not found."));
    return null;
  }
  if (plan.status !== "draft") {
    reply.status(409).send(fail("CONFLICT", "This meal plan is locked."));
    return null;
  }
  return plan;
}

function currentPlanningState() {
  const currentWeek = { weekStart: state.weeks.current, weekEnd: addDays(state.weeks.current, 6) };
  const nextWeek = { weekStart: state.weeks.next, weekEnd: addDays(state.weeks.next, 6) };
  const activePlan = state.plans.find((plan) => plan.weekStart === state.weeks.current && plan.status !== "draft") ?? null;
  const nextDraft = state.plans.find((plan) => plan.weekStart === state.weeks.next)
    ?? [...state.plans].filter((plan) => plan.status === "draft").sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0]
    ?? null;
  return { activePlan, nextDraft, currentWeek, nextWeek };
}

function fixtureInfo() {
  return { scenario: state.scenario, weeks: state.weeks, today: state.today };
}

function params(request: { params: unknown }) {
  return request.params as Record<string, string>;
}

export function buildMockApi(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/healthz", async () => ok({ status: "ok" }));
  app.post("/__mock/reset", async (request, reply) => {
    const scenario = (request.body as { scenario?: string } | null)?.scenario ?? "default";
    if (!(["default", "missing-shopping-list", "no-current-plan"] as string[]).includes(scenario)) {
      return reply.status(400).send(fail("BAD_REQUEST", `Unknown mock scenario: ${scenario}`));
    }
    state = createState(scenario as MockScenario);
    return ok(fixtureInfo());
  });

  app.get("/api/settings", async () => ok(state.settings));
  app.patch("/api/settings", async (request) => {
    Object.assign(state.settings.settings, request.body ?? {}, { updatedAt: nextTimestamp() });
    return ok(state.settings);
  });
  app.post("/api/settings/test-ai", async () => ok({ models: [{ id: "mock-planner" }], authConfigured: false }));

  app.get("/api/recipes", async (): Promise<ReturnType<typeof ok<RecipeListDto>>> => ok({
    recipes: state.recipes.map(recipeSummary),
    invalidRecipes: [],
    count: state.recipes.length,
  }));
  app.get("/api/recipes/imports", async () => ok([]));
  app.post("/api/recipes/imports", async (request, reply) => reply.status(202).send(ok({
    id: nextId("import"),
    sourceUrl: (request.body as { url?: string } | null)?.url ?? "https://example.test/recipe",
    status: "succeeded",
    recipeId: state.recipes[0]!.id,
    recipeTitle: state.recipes[0]!.title,
    error: null,
    deduplicated: true,
    createdAt: nextTimestamp(),
    updatedAt: nextTimestamp(),
    completedAt: nextTimestamp(),
  })));
  app.get("/api/recipes/imports/:jobId", async (request) => ok({
    id: params(request).jobId,
    sourceUrl: "https://example.test/recipe",
    status: "succeeded",
    recipeId: state.recipes[0]!.id,
    recipeTitle: state.recipes[0]!.title,
    error: null,
    deduplicated: true,
    createdAt: nextTimestamp(),
    updatedAt: nextTimestamp(),
    completedAt: nextTimestamp(),
  }));
  app.get("/api/recipes/:recipeId", async (request, reply) => {
    const recipe = state.recipes.find((candidate) => candidate.id === params(request).recipeId);
    return recipe ? ok(recipe) : reply.status(404).send(fail("NOT_FOUND", "Recipe not found."));
  });

  app.get("/api/plans/current", async () => ok(currentPlanningState()));
  app.get("/api/plans", async () => ok([...state.plans].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).map(planSummary)));
  app.get("/api/plans/by-week/:weekStart", async (request) =>
    ok(state.plans.find((plan) => plan.weekStart === params(request).weekStart) ?? null));
  app.post("/api/plans", async (request, reply) => {
    const weekStart = (request.body as { weekStart?: string } | null)?.weekStart;
    if (!weekStart) return reply.status(400).send(fail("BAD_REQUEST", "weekStart is required."));
    if (state.plans.some((plan) => plan.weekStart === weekStart)) {
      return reply.status(409).send(fail("CONFLICT", "A plan already exists for that week."));
    }
    const plan = makePlan({ id: nextId("plan-blank"), weekStart, status: "draft", recipes: state.recipes, mealDates: [] });
    state.plans.push(plan);
    return ok(plan);
  });
  app.post("/api/plans/generate", async (request, reply) => {
    const body = request.body as { weekStart?: string; replaceExisting?: boolean; mealCount?: number } | null;
    if (!body?.weekStart) return reply.status(400).send(fail("BAD_REQUEST", "weekStart is required."));
    const existing = state.plans.find((plan) => plan.weekStart === body.weekStart);
    if (existing && !body.replaceExisting) return reply.status(409).send(fail("CONFLICT", "A plan already exists for that week."));
    if (existing?.status !== undefined && existing.status !== "draft") {
      return reply.status(409).send(fail("CONFLICT", "A locked plan cannot be replaced."));
    }
    if (existing) {
      state.plans = state.plans.filter((plan) => plan.id !== existing.id);
      delete state.shoppingLists[existing.id];
    }
    const count = body.mealCount ?? state.settings.settings.defaultWeeklyMealCount;
    const mealDates = Array.from({ length: count }, (_, index) => addDays(body.weekStart!, index % 7));
    const plan = makePlan({
      id: nextId("plan-generated"),
      weekStart: body.weekStart,
      status: "draft",
      recipes: state.recipes,
      mealDates,
      creationSource: "ai",
    });
    state.plans.push(plan);
    state.shoppingLists[plan.id] = makeShoppingList(plan);
    return ok(plan);
  });
  app.post("/api/plans/:planId/commit", async (request, reply) => {
    const plan = planById(params(request).planId);
    if (!plan) return reply.status(404).send(fail("NOT_FOUND", "Meal plan not found."));
    if (plan.status === "draft") {
      plan.status = "committed";
      plan.commitSource = "manual";
      plan.committedAt = nextTimestamp();
    }
    return ok(plan);
  });
  app.post("/api/plans/:planId/meals", async (request, reply) => {
    const plan = editablePlan(reply, params(request).planId);
    if (!plan) return;
    const body = request.body as { date: string; slot?: string | null; recipeId: string; servings?: number; notes?: string };
    const recipe = state.recipes.find((candidate) => candidate.id === body.recipeId);
    if (!recipe) return reply.status(400).send(fail("BAD_REQUEST", "Selected recipe is not available."));
    const meal = makeMeal(plan.id, body.date, plan.meals.length, recipe);
    meal.id = nextId("meal");
    meal.slot = body.slot ?? null;
    meal.servings = body.servings ?? state.settings.settings.defaultMealServings;
    meal.notes = body.notes ?? "";
    plan.meals.push(meal);
    return ok(plan);
  });
  app.patch("/api/plans/:planId/meals/:mealId", async (request, reply) => {
    const plan = editablePlan(reply, params(request).planId);
    if (!plan) return;
    const meal = plan.meals.find((candidate) => candidate.id === params(request).mealId);
    if (!meal) return reply.status(404).send(fail("NOT_FOUND", "Meal not found."));
    Object.assign(meal, request.body ?? {});
    return ok(plan);
  });
  app.delete("/api/plans/:planId/meals/:mealId", async (request, reply) => {
    const plan = editablePlan(reply, params(request).planId);
    if (!plan) return;
    plan.meals = plan.meals.filter((meal) => meal.id !== params(request).mealId);
    return ok(plan);
  });
  app.patch("/api/plans/:planId/skipped-days", async (request, reply) => {
    const plan = editablePlan(reply, params(request).planId);
    if (!plan) return;
    const body = request.body as { date: string; skipped: boolean };
    const dates = new Set(plan.skippedDates);
    if (body.skipped) dates.add(body.date);
    else dates.delete(body.date);
    plan.skippedDates = [...dates].sort();
    return ok(plan);
  });
  app.post("/api/plans/:planId/meals/:mealId/swap", async (request, reply) => {
    const plan = editablePlan(reply, params(request).planId);
    if (!plan) return;
    const meal = plan.meals.find((candidate) => candidate.id === params(request).mealId);
    if (!meal) return reply.status(404).send(fail("NOT_FOUND", "Meal not found."));
    const body = request.body as { mode: "manual" | "ai"; recipeId?: string };
    const recipe = body.mode === "manual"
      ? state.recipes.find((candidate) => candidate.id === body.recipeId)
      : state.recipes.find((candidate) => candidate.id !== meal.recipeId);
    if (!recipe) return reply.status(400).send(fail("BAD_REQUEST", "Selected recipe is not available."));
    meal.recipeId = recipe.id;
    meal.recipeTitleSnapshot = recipe.title;
    meal.swapCount += 1;
    return ok(plan);
  });
  app.patch("/api/adherence", async (request, reply) => {
    const body = request.body as { mealId: string; status: "planned" | "done" | "skipped" };
    const plan = state.plans.find((candidate) => candidate.meals.some((meal) => meal.id === body.mealId));
    const meal = plan?.meals.find((candidate) => candidate.id === body.mealId);
    if (!plan || !meal) return reply.status(404).send(fail("NOT_FOUND", "Meal not found."));
    if (plan.status === "draft") return reply.status(409).send(fail("CONFLICT", "Adherence requires a committed plan."));
    meal.status = body.status;
    return ok(plan);
  });

  app.get("/api/plans/:planId/shopping-list", async (request) => ok(state.shoppingLists[params(request).planId] ?? null));
  app.post("/api/plans/:planId/shopping-list", async (request, reply) => {
    const plan = planById(params(request).planId);
    if (!plan) return reply.status(404).send(fail("NOT_FOUND", "Meal plan not found."));
    if (state.shoppingLists[plan.id] && plan.status !== "draft") {
      return reply.status(409).send(fail("CONFLICT", "A locked shopping list cannot be regenerated."));
    }
    if (plan.meals.length === 0) {
      delete state.shoppingLists[plan.id];
      return ok(null);
    }
    state.shoppingLists[plan.id] = makeShoppingList(plan);
    return ok(state.shoppingLists[plan.id]);
  });
  app.patch("/api/shopping/items/:itemId", async (request, reply) => {
    const item = Object.values(state.shoppingLists).flatMap((list) => list.items)
      .find((candidate) => candidate.id === params(request).itemId);
    if (!item) return reply.status(404).send(fail("NOT_FOUND", "Shopping item not found."));
    item.checked = Boolean((request.body as { checked?: boolean } | null)?.checked);
    return ok(item);
  });

  app.setNotFoundHandler((_request, reply) => reply.status(404).send(fail("NOT_FOUND", "Mock endpoint not implemented.")));
  return app;
}

state = createState("default");

export async function startMockApi() {
  const app = buildMockApi();
  await app.listen({ host: "127.0.0.1", port: 3199 });
  return app;
}
