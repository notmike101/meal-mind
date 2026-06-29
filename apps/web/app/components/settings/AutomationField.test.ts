import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AutomationField from "./AutomationField.vue";

describe("AutomationField", () => {
  it("renders and updates the automatic planning preference", async () => {
    const wrapper = mount(AutomationField, { props: { modelValue: true } });
    const checkbox = wrapper.get("input[type='checkbox']");

    expect((checkbox.element as HTMLInputElement).checked).toBe(true);
    await checkbox.setValue(false);

    expect(wrapper.emitted("update:modelValue")).toEqual([[false]]);
  });
});
