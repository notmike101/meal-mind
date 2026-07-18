import type { RecipeImportJobDto } from "@mealmind/contracts";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ImportRecipeForm from "./ImportRecipeForm.vue";

const baseJob: RecipeImportJobDto = {
  id: "job-1",
  sourceUrl: "https://example.com/recipes/pasta",
  status: "succeeded",
  recipeId: "pasta",
  recipeTitle: "Weeknight Pasta",
  error: null,
  deduplicated: false,
  createdAt: "2026-07-15T00:00:00.000Z",
  updatedAt: "2026-07-15T00:00:01.000Z",
  completedAt: "2026-07-15T00:00:01.000Z",
};

function render(props: Partial<InstanceType<typeof ImportRecipeForm>["$props"]> = {}) {
  return mount(ImportRecipeForm, {
    props: { job: null, ...props },
  });
}

describe("ImportRecipeForm", () => {
  it("emits a trimmed URL when submitted", async () => {
    const wrapper = render();
    await wrapper.get("input").setValue("  https://example.com/recipe  ");
    await wrapper.get("form").trigger("submit");

    expect(wrapper.emitted("submit")).toEqual([["https://example.com/recipe"]]);
  });

  it("disables the input and shows progress while importing", () => {
    const wrapper = render({ busy: true });

    expect(wrapper.get("input").attributes("disabled")).toBeDefined();
    expect(wrapper.get("button").attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("Importing…");
  });

  it("shows success, duplicate, and view-recipe states", async () => {
    const wrapper = render({ job: baseJob });

    expect(wrapper.text()).toContain("Recipe imported and ready to plan.");
    expect(wrapper.text()).toContain("View recipe");
    await wrapper.get("a").trigger("click");
    expect(wrapper.emitted("viewRecipe")?.[0]?.[1]).toBe("pasta");

    await wrapper.setProps({ job: { ...baseJob, deduplicated: true } });
    expect(wrapper.text()).toContain("already in your library");
  });

  it("shows actionable failure messages", () => {
    const wrapper = render({
      job: { ...baseJob, status: "failed", recipeId: null, recipeTitle: null, error: "No supported recipe data was found." },
    });

    expect(wrapper.get('[role="status"]').text()).toContain("No supported recipe data was found.");
  });
});
