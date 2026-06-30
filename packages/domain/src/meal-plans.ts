import type { MealDto as Meal } from "@mealmind/contracts";
import type { WeekRange } from "./weeks.js";
import { isDateWithinRange } from "./weeks.js";

export type PlannedMealInput = {
  date: string;
  slot?: string | null;
  recipeId: string;
  reason?: string;
};

export function normalizeMealSlot(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

export function validatePlannedMealsForWeek(meals: PlannedMealInput[], week: WeekRange, expectedCount?: number) {
  const errors: string[] = [];

  if (expectedCount !== undefined && meals.length !== expectedCount) {
    errors.push(`Expected exactly ${expectedCount} meals but received ${meals.length}.`);
  }

  for (const meal of meals) {
    if (!isDateWithinRange(meal.date, week)) {
      errors.push(`${meal.date} is outside ${week.weekStart} through ${week.weekEnd}.`);
    }
    if ((meal.slot?.trim().length ?? 0) > 50) {
      errors.push(`Meal slot labels must be 50 characters or fewer.`);
    }
  }

  return errors;
}

export function sortMeals(meals: Meal[]) {
  return [...meals].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.id.localeCompare(b.id);
  });
}
