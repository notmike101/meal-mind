import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RecipeToken from "./RecipeToken.vue";

describe("RecipeToken", () => {
  it("renders ingredient tokens with the preserved accent class", () => {
    const wrapper = mount(RecipeToken, {
      props: {
        token: {
          type: "ingredient",
          text: "1 cup rice",
          ingredient: {
            name: "rice",
            alias: null,
            note: null,
            quantity: null,
            displayText: "1 cup rice",
            stepNumbers: [1],
          },
        },
      },
    });
    expect(wrapper.text()).toBe("1 cup rice");
    expect(wrapper.get("span").classes()).toContain("text-moss");
  });
});
