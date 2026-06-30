import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { isPlanLocked, shouldAutoLockPlan, sortMeals, type WeekRange } from "@mealmind/domain";
import { getDb } from "../client.js";
import {
  mealPlans,
  planMeals,
  type InsertMealPlan,
  type InsertPlanMeal,
  type MealPlan,
  type PlanMeal,
} from "../schema.js";

export type PlanWithMeals = MealPlan & {
  meals: PlanMeal[];
};

export async function createPlanWithMeals(plan: InsertMealPlan, meals: InsertPlanMeal[]) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.insert(mealPlans).values(plan);
    if (meals.length > 0) await tx.insert(planMeals).values(meals);
  });
  const saved = await getPlanWithMeals(plan.id);
  if (!saved) throw new Error("Plan was inserted but could not be read back.");
  return saved;
}

export async function replacePlanWithMeals(plan: InsertMealPlan, meals: InsertPlanMeal[]) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(mealPlans).where(eq(mealPlans.weekStart, plan.weekStart));
    await tx.insert(mealPlans).values(plan);
    if (meals.length > 0) await tx.insert(planMeals).values(meals);
  });
  const saved = await getPlanWithMeals(plan.id);
  if (!saved) throw new Error("Plan was replaced but could not be read back.");
  return saved;
}

export async function getPlanWithMeals(planId: string): Promise<PlanWithMeals | null> {
  const db = getDb();
  const plan = (await db.select().from(mealPlans).where(eq(mealPlans.id, planId)).limit(1))[0];
  if (!plan) return null;
  const meals = await db.select().from(planMeals).where(eq(planMeals.planId, plan.id));
  return { ...plan, meals: sortMeals(meals) };
}

export async function getPlanByWeekStart(weekStart: string) {
  const plan = (await getDb().select().from(mealPlans).where(eq(mealPlans.weekStart, weekStart)).limit(1))[0];
  return plan ? getPlanWithMeals(plan.id) : null;
}

export async function getPlansOverlapping(range: WeekRange) {
  const plans = await getDb()
    .select()
    .from(mealPlans)
    .where(and(lte(mealPlans.weekStart, range.weekEnd), gte(mealPlans.weekEnd, range.weekStart)))
    .orderBy(desc(mealPlans.weekStart));
  const withMeals = await Promise.all(plans.map((plan) => getPlanWithMeals(plan.id)));
  return withMeals.filter((plan): plan is PlanWithMeals => Boolean(plan));
}

export async function getMostRecentDraft() {
  const plan = (
    await getDb().select().from(mealPlans).where(eq(mealPlans.status, "draft")).orderBy(desc(mealPlans.weekStart)).limit(1)
  )[0];
  return plan ? getPlanWithMeals(plan.id) : null;
}

export async function updatePlanStatus(planId: string, status: MealPlan["status"], commitSource?: "manual" | "auto") {
  const now = new Date().toISOString();
  await getDb()
    .update(mealPlans)
    .set({ status, commitSource: commitSource ?? null, committedAt: status === "draft" ? null : now })
    .where(eq(mealPlans.id, planId));
  return getPlanWithMeals(planId);
}

export async function updatePlanSkippedDates(planId: string, skippedDates: string[]) {
  await getDb()
    .update(mealPlans)
    .set({ skippedDates })
    .where(eq(mealPlans.id, planId));
  return getPlanWithMeals(planId);
}

export async function applyLazyLocks(now: Date, timezone: string) {
  const drafts = await getDb().select().from(mealPlans).where(eq(mealPlans.status, "draft"));
  for (const plan of drafts) {
    if (shouldAutoLockPlan(plan, now, timezone)) await updatePlanStatus(plan.id, "active", "auto");
  }
}

function assertEditable(plan: PlanWithMeals | null): asserts plan is PlanWithMeals {
  if (!plan) throw new Error("Plan not found.");
  if (isPlanLocked(plan)) throw new Error("Plan is locked.");
}

export async function insertPlanMeal(meal: InsertPlanMeal) {
  const plan = await getPlanWithMeals(meal.planId);
  assertEditable(plan);
  await getDb().insert(planMeals).values(meal);
  return getPlanWithMeals(meal.planId);
}

export async function updatePlanMeal(input: {
  planId: string;
  mealId: string;
  date?: string;
  slot?: string | null;
  servings?: number;
  notes?: string;
}) {
  const plan = await getPlanWithMeals(input.planId);
  assertEditable(plan);
  const meal = plan.meals.find((candidate) => candidate.id === input.mealId);
  if (!meal) throw new Error("Meal not found.");

  const updates: Partial<typeof planMeals.$inferInsert> = {};
  if (input.date !== undefined) {
    updates.date = input.date;
    if (input.date !== meal.date) {
      updates.sortOrder = Math.max(-1, ...plan.meals.filter((candidate) => candidate.date === input.date).map((candidate) => candidate.sortOrder)) + 1;
    }
  }
  if (input.slot !== undefined) updates.slot = input.slot;
  if (input.servings !== undefined) updates.servings = input.servings;
  if (input.notes !== undefined) updates.notes = input.notes;

  await getDb().update(planMeals).set(updates).where(and(eq(planMeals.id, input.mealId), eq(planMeals.planId, input.planId)));
  return getPlanWithMeals(input.planId);
}

export async function deletePlanMeal(planId: string, mealId: string) {
  const plan = await getPlanWithMeals(planId);
  assertEditable(plan);
  if (!plan.meals.some((meal) => meal.id === mealId)) throw new Error("Meal not found.");
  await getDb().delete(planMeals).where(and(eq(planMeals.id, mealId), eq(planMeals.planId, planId)));
  return getPlanWithMeals(planId);
}

export async function replaceMealRecipe(input: {
  planId: string;
  mealId: string;
  recipeId: string;
  recipeTitleSnapshot: string;
  notes?: string;
}) {
  const plan = await getPlanWithMeals(input.planId);
  assertEditable(plan);
  const existing = plan.meals.find((meal) => meal.id === input.mealId);
  if (!existing) throw new Error("Meal not found.");
  await getDb()
    .update(planMeals)
    .set({
      recipeId: input.recipeId,
      recipeTitleSnapshot: input.recipeTitleSnapshot,
      notes: input.notes ?? existing.notes,
      swapCount: existing.swapCount + 1,
    })
    .where(and(eq(planMeals.id, input.mealId), eq(planMeals.planId, input.planId)));
  return getPlanWithMeals(input.planId);
}

export async function updateMealStatus(mealId: string, status: PlanMeal["status"]) {
  const db = getDb();
  await db.update(planMeals).set({ status }).where(eq(planMeals.id, mealId));
  const meal = (await db.select().from(planMeals).where(eq(planMeals.id, mealId)).limit(1))[0];
  return meal ? getPlanWithMeals(meal.planId) : null;
}

export async function getMealsByIds(mealIds: string[]) {
  if (mealIds.length === 0) return [];
  return getDb().select().from(planMeals).where(inArray(planMeals.id, mealIds));
}
