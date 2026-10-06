import type { MealPlanDto, RecipeSummaryDto } from "@mealmind/contracts";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import SectionPanel from "~/components/SectionPanel.vue";
import { usePlanningStore } from "~/stores/planning";
import SelectionWorkspace from "./SelectionWorkspace.vue";
import ScheduleStrip from "./ScheduleStrip.vue";

const plan: MealPlanDto = {
  id: "plan-1",
  weekStart: "2026-07-06",
  weekEnd: "2026-07-12",
  status: "draft",
  creationSource: "ai",
  commitSource: null,
  committedAt: null,
  createdAt: "2026-06-29T00:00:00.000Z",
  aiModel: "test-model",
  aiBaseUrl: "http://localhost/v1",
  aiPromptHash: "hash",
  skippedDates: [],
  meals: [
    { id: "meal-1", planId: "plan-1", date: "2026-07-06", slot: null, recipeId: "missing", recipeTitleSnapshot: "Missing Meal", servings: 1, status: "planned", swapCount: 0, notes: "", sortOrder: 0 },
    { id: "meal-2", planId: "plan-1", date: "2026-07-06", slot: "Dinner", recipeId: "dinner-a", recipeTitleSnapshot: "Dinner A", servings: 2, status: "planned", swapCount: 0, notes: "Balanced dinner", sortOrder: 1 },
  ],
};

function recipe(id: string, title: string, tags: string[]): RecipeSummaryDto {
  return {
    id,
    title,
    description: `${title} description`,
    imageUrl: null,
    sourceUrl: null,
    format: "cooklang",
    defaultServings: 2,
    suggestedSlots: ["Dinner"],
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
    props: ["plan", "activeMealId", "addingDate", "selectedDate"],
    emits: ["select", "add"],
    template: `<div><button data-meal="meal-2" @click="$emit('select', 'meal-2')">Dinner</button><button data-add @click="$emit('add', '2026-07-07')">Add</button></div>`,
  },
  PlanServingsStepper: {
    props: ["servings", "disabled"],
    emits: ["update"],
    template: `<button data-servings @click="$emit('update', 3)">Servings</button>`,
  },
  PlanRecipeSelectionCard: {
    props: ["recipe", "selected", "usedCount", "actionLabel", "disabled"],
    emits: ["choose"],
    template: `<article :data-recipe="recipe.id" :data-selected="selected"><button @click="$emit('choose')">{{ recipe.title }}</button></article>`,
  },
};

function render(withSchedule = false) {
  return mount(SelectionWorkspace, {
    props: { plan, recipes, defaultServings: 2 },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })], components: { SectionPanel, PlanScheduleStrip: ScheduleStrip }, stubs: { ...stubs, ...(withSchedule ? { PlanScheduleStrip: false } : {}) } },
  });
}

describe("SelectionWorkspace", () => {
  it("adds a dated meal with an optional free-text slot", async () => {
    const wrapper = render();
    const planning = usePlanningStore();
    await wrapper.get("[data-add]").trigger("click");
    await wrapper.get('input[list="meal-slot-suggestions"]').setValue("Post-workout");
    await wrapper.get('[data-recipe="dinner-b"] button').trigger("click");
    await flushPromises();
    expect(planning.addMeal).toHaveBeenCalledWith("plan-1", {
      date: "2026-07-07",
      slot: "Post-workout",
      recipeId: "dinner-b",
      servings: 2,
    });
  });

  it("updates an existing meal recipe and servings", async () => {
    const wrapper = render();
    const planning = usePlanningStore();
    await wrapper.get('[data-meal="meal-2"]').trigger("click");
    await wrapper.get('[data-recipe="dinner-b"] button').trigger("click");
    await flushPromises();
    expect(planning.swap).toHaveBeenCalledWith("plan-1", "meal-2", "manual", "dinner-b");
    await wrapper.get("[data-servings]").trigger("click");
    await flushPromises();
    expect(planning.updateMeal).toHaveBeenCalledWith("plan-1", "meal-2", { servings: 3 });
  });

  it("switches to a day's meal or add form, and keeps a skipped day restorable", async () => {
    const wrapper = render(true);
    await wrapper.setProps({ plan: { ...plan, skippedDates: ["2026-07-08"] } });
    await wrapper.findComponent(ScheduleStrip).get("nav").findAll("button")[1]!.trigger("click");
    await wrapper.get('input[list="meal-slot-suggestions"]').setValue("Lunch");
    await wrapper.get('[data-recipe="dinner-b"] button').trigger("click");
    await flushPromises();
    expect(usePlanningStore().addMeal).toHaveBeenCalledWith("plan-1", expect.objectContaining({ date: "2026-07-07", slot: "Lunch" }));
    await wrapper.findComponent(ScheduleStrip).get("nav").findAll("button")[0]!.trigger("click");
    expect((wrapper.get("select").element as HTMLSelectElement).value).toBe("2026-07-06");
    const dinner = wrapper.findComponent(ScheduleStrip).findAll("button").find((button) => button.text().includes("Dinner A"))!;
    await dinner.trigger("click");
    expect(wrapper.get('[data-testid="meal-editor"] h2').text()).toBe("Dinner A");
    await wrapper.findComponent(ScheduleStrip).get("nav").findAll("button")[2]!.trigger("click");
    expect(wrapper.find('input[list="meal-slot-suggestions"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Restore");
  });
});
