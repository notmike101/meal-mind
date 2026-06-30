import type { MealPlanDto, RecipeSummaryDto } from "@mealmind/contracts";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { usePlanningStore } from "~/stores/planning";
import SelectionWorkspace from "./SelectionWorkspace.vue";

const plan: MealPlanDto = {
  id: "plan-1",
  weekStart: "2026-07-06",
  weekEnd: "2026-07-12",
  status: "draft",
  commitSource: null,
  committedAt: null,
  generatedAt: "2026-06-29T00:00:00.000Z",
  aiModel: "test-model",
  aiBaseUrl: "http://localhost/v1",
  aiPromptHash: "hash",
  skippedDates: [],
  slots: [
    { id: "lunch-1", planId: "plan-1", date: "2026-07-06", mealType: "lunch", recipeId: "missing", recipeTitleSnapshot: "Missing Lunch", servings: 1, status: "planned", swapCount: 0, notes: "" },
    { id: "dinner-1", planId: "plan-1", date: "2026-07-06", mealType: "dinner", recipeId: "dinner-a", recipeTitleSnapshot: "Dinner A", servings: 2, status: "planned", swapCount: 0, notes: "Balanced dinner" },
    { id: "dinner-2", planId: "plan-1", date: "2026-07-07", mealType: "dinner", recipeId: "dinner-a", recipeTitleSnapshot: "Dinner A", servings: 2, status: "planned", swapCount: 0, notes: "" },
  ],
};

function recipe(id: string, title: string, tags: string[]): RecipeSummaryDto {
  return {
    id,
    title,
    description: `${title} description`,
    imageUrl: null,
    format: "cooklang",
    defaultServings: 2,
    mealTypes: ["dinner"],
    tags,
    filePath: `${id}.cook`,
    totalTimeMinutes: 30,
    ingredientCount: 5,
    cookwareCount: 1,
    timerCount: 1,
    detailResource: `mealmind://recipes/${id}`,
    appUrl: `/recipes/${id}`,
  };
}

const recipes = [recipe("dinner-a", "Dinner A", ["quick"]), recipe("dinner-b", "Dinner B", ["vegetarian"])];

const stubs = {
  PlanScheduleStrip: {
    props: ["plan", "activeSlotId", "busy"],
    emits: ["select", "toggleDay"],
    template: `<div><button data-slot="lunch-1" @click="$emit('select', 'lunch-1')">Lunch</button><button data-slot="dinner-1" @click="$emit('select', 'dinner-1')">Dinner</button><button data-skip @click="$emit('toggleDay', '2026-07-06', true)">Skip</button></div>`,
  },
  PlanServingsStepper: {
    props: ["servings", "disabled"],
    emits: ["update"],
    template: `<button data-servings @click="$emit('update', 3)">Servings</button>`,
  },
  PlanRecipeSelectionCard: {
    name: "PlanRecipeSelectionCard",
    props: ["recipe", "selected", "usedCount", "actionLabel", "disabled"],
    emits: ["choose"],
    template: `<article :data-recipe="recipe.id" :data-selected="selected" :data-used="usedCount"><span>{{ recipe.title }}</span><button @click="$emit('choose')">Choose</button></article>`,
  },
};

function render() {
  return mount(SelectionWorkspace, {
    props: { plan, recipes },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs,
    },
  });
}

describe("SelectionWorkspace", () => {
  it("shows stale selections and filters the catalog by search and tags", async () => {
     const wrapper = render();
     expect(wrapper.text()).toContain("no longer in the library");

     await wrapper.get('[data-slot="dinner-1"]').trigger("click");
    expect(wrapper.findAll("[data-recipe]")).toHaveLength(2);
    await wrapper.get('input[type="search"]').setValue("Dinner B");
    expect(wrapper.findAll("[data-recipe]")).toHaveLength(1);
    expect(wrapper.text()).toContain("Dinner B");
  });

  it("persists recipe and serving changes immediately while preserving usage state", async () => {
    const wrapper = render();
    const planning = usePlanningStore();
    await wrapper.get('[data-slot="dinner-1"]').trigger("click");
    expect(wrapper.get('[data-recipe="dinner-a"]').attributes("data-selected")).toBe("true");
    expect(wrapper.get('[data-recipe="dinner-a"]').attributes("data-used")).toBe("2");

    await wrapper.get('[data-recipe="dinner-b"] button').trigger("click");
    await flushPromises();
    expect(planning.swap).toHaveBeenCalledWith("plan-1", "dinner-1", "manual", "dinner-b");

    await wrapper.get("[data-servings]").trigger("click");
    await flushPromises();
    expect(planning.updateServings).toHaveBeenCalledWith("plan-1", "dinner-1", 3);
  });

  it("surfaces failed changes inline", async () => {
    const wrapper = render();
    const planning = usePlanningStore();
    vi.mocked(planning.swap).mockRejectedValueOnce(new Error("network unavailable"));
    await wrapper.get('[data-slot="dinner-1"]').trigger("click");
    await wrapper.get('[data-recipe="dinner-b"] button').trigger("click");
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("network unavailable");
  });

  it("persists a whole-day skip from the schedule", async () => {
    const wrapper = render();
    const planning = usePlanningStore();
    await wrapper.get("[data-skip]").trigger("click");
    await flushPromises();
    expect(planning.setDaySkipped).toHaveBeenCalledWith("plan-1", "2026-07-06", true);
  });
});
