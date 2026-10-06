import type { RecipeSummaryDto } from "@mealmind/contracts";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RecipePhoto from "~/components/plan/RecipePhoto.vue";
import RecipeCard from "./RecipeCard.vue";

const recipe: RecipeSummaryDto = {
  id: "test-recipe",
  title: "Test Recipe",
  description: "A deliberately long recipe description for the catalog card.",
  imageUrl: "/api/recipes/test-recipe/image",
  sourceUrl: null,
  format: "cooklang",
  defaultServings: 2,
  suggestedSlots: ["Dinner"],
  tags: ["quick"],
  filePath: "test-recipe.cook",
  totalTimeMinutes: 30,
  ingredientCount: 8,
  cookwareCount: 2,
  timerCount: 1,
  detailResource: "mealmind://recipes/test-recipe",
  appUrl: "/recipes/test-recipe",
};

function render(imageUrl: string | null = recipe.imageUrl) {
  return mount(RecipeCard, {
    props: { recipe: { ...recipe, imageUrl } },
    global: {
      components: { PlanRecipePhoto: RecipePhoto },
      stubs: {
        NuxtLink: { props: ["to"], template: '<a :href="to"><slot /></a>' },
        RecipesRecipeMeta: { template: "<div />" },
      },
    },
  });
}

describe("RecipeCard", () => {
  it("uses the photo fallback when an image is unavailable", () => {
    const wrapper = render(null);

    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.get('[role="img"]').attributes("aria-label")).toBe("No photo available for Test Recipe");
  });

  it("opens details from a normal card click while preserving modified-link navigation", async () => {
    const wrapper = render();
    const link = wrapper.get("a");

    await link.trigger("click");
    expect(wrapper.emitted("openDetails")?.[0]?.[0]).toBe("test-recipe");

    await link.trigger("click", { ctrlKey: true });
    expect(wrapper.emitted("openDetails")).toHaveLength(1);
  });
});
