import type { MealSlotDto as MealSlot } from "@helloqwen/contracts";
import type { MealType, WeekRange } from "./weeks.js";
import { getWeekSlots, isDateWithinRange } from "./weeks.js";

export type PlannedSlotInput = {
  date: string;
  mealType: MealType;
  recipeId: string;
  reason?: string;
};

export function validatePlannedSlotsForWeek(slots: PlannedSlotInput[], week: WeekRange) {
  const expectedSlots = getWeekSlots(week.weekStart);
  const errors: string[] = [];

  if (slots.length !== 14) {
    errors.push(`Expected exactly 14 slots but received ${slots.length}.`);
  }

  const seen = new Set<string>();
  for (const slot of slots) {
    if (!isDateWithinRange(slot.date, week)) {
      errors.push(`${slot.date} ${slot.mealType} is outside ${week.weekStart} through ${week.weekEnd}.`);
    }

    const key = `${slot.date}:${slot.mealType}`;
    if (seen.has(key)) {
      errors.push(`Duplicate meal slot ${key}.`);
    }
    seen.add(key);
  }

  for (const slot of expectedSlots) {
    const key = `${slot.date}:${slot.mealType}`;
    if (!seen.has(key)) {
      errors.push(`Missing meal slot ${key}.`);
    }
  }

  return errors;
}

export function sortMealSlots(slots: MealSlot[]) {
  const mealOrder = new Map([
    ["lunch", 0],
    ["dinner", 1],
  ]);

  return [...slots].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return (mealOrder.get(a.mealType) ?? 99) - (mealOrder.get(b.mealType) ?? 99);
  });
}
