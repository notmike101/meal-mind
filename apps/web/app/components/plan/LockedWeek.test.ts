import type { MealPlanDto } from "@mealmind/contracts";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import LockedWeek from "./LockedWeek.vue";

const plan: MealPlanDto = {
  id: "plan-1", weekStart: "2026-07-06", weekEnd: "2026-07-12", status: "committed",
  creationSource: "manual", commitSource: "manual", committedAt: "2026-07-01T00:00:00.000Z",
  createdAt: "2026-06-29T00:00:00.000Z", aiModel: null, aiBaseUrl: null, aiPromptHash: null,
  skippedDates: [],
  meals: [{ id: "meal-1", planId: "plan-1", date: "2026-07-06", slot: null, recipeId: "missing", recipeTitleSnapshot: "Archived Meal", servings: 2, status: "planned", swapCount: 0, notes: "Saved snapshot", sortOrder: 0 }],
};

describe("LockedWeek", () => {
  it("renders an unlabeled read-only meal snapshot", () => {
    const wrapper = mount(LockedWeek, {
      props: { plan, recipes: [] },
      global: { stubs: { PlanRecipePhoto: true, NuxtLink: true } },
    });
    expect(wrapper.text()).toContain("Archived Meal");
    expect(wrapper.text()).toContain("Recipe no longer in library");
    expect(wrapper.text()).toContain("Meal");
    expect(wrapper.find("button").exists()).toBe(false);
  });
});
