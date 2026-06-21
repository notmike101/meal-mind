import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { isPlanLocked, shouldAutoLockPlan, sortMealSlots, type WeekRange } from "@helloqwen/domain";
import { getDb } from "../client.js";
import {
  mealPlans,
  mealSlots,
  type InsertMealPlan,
  type InsertMealSlot,
  type MealPlan,
  type MealSlot,
} from "../schema.js";

export type PlanWithSlots = MealPlan & {
  slots: MealSlot[];
};

export async function createPlanWithSlots(plan: InsertMealPlan, slots: InsertMealSlot[]) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.insert(mealPlans).values(plan);
    if (slots.length > 0) {
      await tx.insert(mealSlots).values(slots);
    }
  });
  const saved = await getPlanWithSlots(plan.id);
  if (!saved) {
    throw new Error("Plan was inserted but could not be read back.");
  }
  return saved;
}

export async function replacePlanWithSlots(plan: InsertMealPlan, slots: InsertMealSlot[]) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(mealPlans).where(eq(mealPlans.weekStart, plan.weekStart));
    await tx.insert(mealPlans).values(plan);
    if (slots.length > 0) {
      await tx.insert(mealSlots).values(slots);
    }
  });
  const saved = await getPlanWithSlots(plan.id);
  if (!saved) {
    throw new Error("Plan was replaced but could not be read back.");
  }
  return saved;
}

export async function getPlanWithSlots(planId: string): Promise<PlanWithSlots | null> {
  const db = getDb();
  const plan = (await db.select().from(mealPlans).where(eq(mealPlans.id, planId)).limit(1))[0];
  if (!plan) {
    return null;
  }

  const slots = await db.select().from(mealSlots).where(eq(mealSlots.planId, plan.id));
  return {
    ...plan,
    slots: sortMealSlots(slots),
  };
}

export async function getPlanByWeekStart(weekStart: string) {
  const plan = (await getDb().select().from(mealPlans).where(eq(mealPlans.weekStart, weekStart)).limit(1))[0];
  return plan ? getPlanWithSlots(plan.id) : null;
}

export async function getPlansOverlapping(range: WeekRange) {
  const plans = await getDb()
    .select()
    .from(mealPlans)
    .where(and(lte(mealPlans.weekStart, range.weekEnd), gte(mealPlans.weekEnd, range.weekStart)))
    .orderBy(desc(mealPlans.weekStart));

  const withSlots = await Promise.all(plans.map((plan) => getPlanWithSlots(plan.id)));
  return withSlots.filter((plan): plan is PlanWithSlots => Boolean(plan));
}

export async function getMostRecentDraft() {
  const plan = (
    await getDb()
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.status, "draft"))
      .orderBy(desc(mealPlans.weekStart))
      .limit(1)
  )[0];
  return plan ? getPlanWithSlots(plan.id) : null;
}

export async function updatePlanStatus(
  planId: string,
  status: MealPlan["status"],
  commitSource?: "manual" | "auto",
) {
  const now = new Date().toISOString();
  await getDb()
    .update(mealPlans)
    .set({
      status,
      commitSource: commitSource ?? null,
      committedAt: status === "draft" ? null : now,
    })
    .where(eq(mealPlans.id, planId));
  return getPlanWithSlots(planId);
}

export async function applyLazyLocks(now: Date, timezone: string) {
  const drafts = await getDb().select().from(mealPlans).where(eq(mealPlans.status, "draft"));
  for (const plan of drafts) {
    if (shouldAutoLockPlan(plan, now, timezone)) {
      await updatePlanStatus(plan.id, "active", "auto");
    }
  }
}

export async function updateSlotServing(planId: string, slotId: string, servings: number, notes?: string) {
  const plan = await getPlanWithSlots(planId);
  if (!plan) {
    throw new Error("Plan not found.");
  }
  if (isPlanLocked(plan)) {
    throw new Error("Plan is locked.");
  }

  const updates: Partial<typeof mealSlots.$inferInsert> = { servings };
  if (notes !== undefined) {
    updates.notes = notes;
  }

  await getDb()
    .update(mealSlots)
    .set(updates)
    .where(and(eq(mealSlots.id, slotId), eq(mealSlots.planId, planId)));

  return getPlanWithSlots(planId);
}

export async function replaceSlotRecipe(input: {
  planId: string;
  slotId: string;
  recipeId: string;
  recipeTitleSnapshot: string;
  notes?: string;
}) {
  const plan = await getPlanWithSlots(input.planId);
  if (!plan) {
    throw new Error("Plan not found.");
  }
  if (isPlanLocked(plan)) {
    throw new Error("Plan is locked.");
  }

  const existing = plan.slots.find((slot) => slot.id === input.slotId);
  if (!existing) {
    throw new Error("Slot not found.");
  }

  await getDb()
    .update(mealSlots)
    .set({
      recipeId: input.recipeId,
      recipeTitleSnapshot: input.recipeTitleSnapshot,
      notes: input.notes ?? existing.notes,
      swapCount: existing.swapCount + 1,
    })
    .where(and(eq(mealSlots.id, input.slotId), eq(mealSlots.planId, input.planId)));

  return getPlanWithSlots(input.planId);
}

export async function updateSlotStatus(slotId: string, status: MealSlot["status"]) {
  const db = getDb();
  await db.update(mealSlots).set({ status }).where(eq(mealSlots.id, slotId));
  const slot = (await db.select().from(mealSlots).where(eq(mealSlots.id, slotId)).limit(1))[0];
  return slot ? getPlanWithSlots(slot.planId) : null;
}

export async function getSlotsByIds(slotIds: string[]) {
  if (slotIds.length === 0) {
    return [];
  }

  return getDb().select().from(mealSlots).where(inArray(mealSlots.id, slotIds));
}
