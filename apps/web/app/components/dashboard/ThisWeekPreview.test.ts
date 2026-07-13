import type { MealPlanDto } from "@mealmind/contracts";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ThisWeekPreview from "./ThisWeekPreview.vue";

const plan: MealPlanDto = {
  id: "plan-1",
  weekStart: "2026-07-06",
  weekEnd: "2026-07-12",
  status: "active",
  creationSource: "manual",
  commitSource: "manual",
  committedAt: "2026-07-01T00:00:00.000Z",
  createdAt: "2026-06-29T00:00:00.000Z",
  aiModel: null,
  aiBaseUrl: null,
  aiPromptHash: null,
  skippedDates: ["2026-07-10"],
  meals: [
    {
      id: "meal-1", planId: "plan-1", date: "2026-07-08", slot: "Lunch", recipeId: "recipe-1",
      recipeTitleSnapshot: "Tomato Pasta", servings: 2, status: "planned", swapCount: 0, notes: "", sortOrder: 0,
    },
    {
      id: "meal-2", planId: "plan-1", date: "2026-07-09", slot: "Dinner", recipeId: "recipe-2",
      recipeTitleSnapshot: "Miso Rice", servings: 2, status: "planned", swapCount: 0, notes: "", sortOrder: 1,
    },
  ],
};
const firstMeal = plan.meals[0]!;

function render(currentPlan = plan, today = "2026-07-07") {
  return mount(ThisWeekPreview, {
    props: { plan: currentPlan, today },
    global: {
      stubs: {
        NuxtLink: { props: ["to"], template: '<a :href="to"><slot /></a>' },
      },
    },
  });
}

describe("ThisWeekPreview", () => {
  it("shows future meals, skips excluded dates, and reports empty remaining days", () => {
    const wrapper = render();

    expect(wrapper.text()).toContain("2 meals across 4 remaining days");
    expect(wrapper.text()).toContain("Wed, Jul 8");
    expect(wrapper.text()).toContain("Thu, Jul 9");
    expect(wrapper.text()).toContain("Sat, Jul 11");
    expect(wrapper.text()).toContain("Sun, Jul 12");
    expect(wrapper.text()).not.toContain("Fri, Jul 10");
    expect(wrapper.text()).toContain("No meals planned.");
    expect(wrapper.text()).toContain("Tomato Pasta");
    expect(wrapper.text()).toContain("Miso Rice");
  });

  it("uses singular labels for one remaining meal and day", () => {
    const oneMealPlan = {
      ...plan,
      skippedDates: [],
      meals: [firstMeal],
    };

    const wrapper = render(oneMealPlan, "2026-07-07");

    expect(wrapper.text()).toContain("1 meal across 5 remaining days");
  });

  it("uses singular labels when one meal remains on one day", () => {
    const lastMealPlan = {
      ...plan,
      skippedDates: [],
      meals: [{ ...firstMeal, date: "2026-07-12" }],
    };
    const wrapper = render(lastMealPlan, "2026-07-11");

    expect(wrapper.text()).toContain("1 meal across 1 remaining day");
  });
});
