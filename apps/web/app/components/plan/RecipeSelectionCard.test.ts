import type { RecipeSummaryDto } from "@mealmind/contracts";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RecipeSelectionCard from "./RecipeSelectionCard.vue";

const recipe: RecipeSummaryDto = {
  id: "recipe-a",
  title: "Recipe A",
  description: "Recipe A description",
  imageUrl: null,
  sourceUrl: null,
  format: "cooklang",
  defaultServings: 2,
  suggestedSlots: ["Dinner"],
  tags: ["quick"],
  filePath: "recipe-a.cook",
  totalTimeMinutes: 30,
  ingredientCount: 5,
  cookwareCount: 1,
  timerCount: 1,
  detailResource: "mealmind://recipes/recipe-a",
  appUrl: "/recipes/recipe-a",
};

function render() {
  return mount(RecipeSelectionCard, {
    props: { recipe, selected: false, usedCount: 0, actionLabel: "Choose recipe", disabled: false },
    global: { stubs: { PlanRecipePhoto: true } },
  });
}

describe("RecipeSelectionCard", () => {
  it("opens details from the card body without choosing the recipe", async () => {
    const wrapper = render();
    await wrapper.get("a").trigger("click");

    expect(wrapper.emitted("openDetails")?.[0]?.[0]).toBe("recipe-a");
    expect(wrapper.emitted("choose")).toBeUndefined();
  });

  it("keeps the choose action separate from recipe details", async () => {
    const wrapper = render();
    await wrapper.get("button").trigger("click");

    expect(wrapper.emitted("choose")).toHaveLength(1);
    expect(wrapper.emitted("openDetails")).toBeUndefined();
  });
});
