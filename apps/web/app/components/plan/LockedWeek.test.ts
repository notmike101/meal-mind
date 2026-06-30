import type { MealPlanDto } from "@mealmind/contracts";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import LockedWeek from "./LockedWeek.vue";

const plan: MealPlanDto = {
  id: "plan-1", weekStart: "2026-07-06", weekEnd: "2026-07-12", status: "committed", commitSource: "manual",
  committedAt: "2026-07-01T00:00:00.000Z", generatedAt: "2026-06-29T00:00:00.000Z", aiModel: "model",
  aiBaseUrl: "http://localhost/v1", aiPromptHash: "hash",
  slots: [{ id: "slot-1", planId: "plan-1", date: "2026-07-06", mealType: "dinner", recipeId: "missing", recipeTitleSnapshot: "Archived Dinner", servings: 2, status: "planned", swapCount: 0, notes: "Saved snapshot" }],
};

describe("LockedWeek", () => {
  it("renders a read-only chronological snapshot for missing recipes", () => {
    const wrapper = mount(LockedWeek, {
      props: { plan, recipes: [] },
      global: { stubs: { PlanRecipePhoto: true, NuxtLink: true } },
    });
    expect(wrapper.text()).toContain("Mon, Jul 6");
    expect(wrapper.text()).toContain("Archived Dinner");
    expect(wrapper.text()).toContain("Recipe no longer in library");
    expect(wrapper.find("button").exists()).toBe(false);
  });
});
