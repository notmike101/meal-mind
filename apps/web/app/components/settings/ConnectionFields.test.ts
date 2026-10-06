import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ConnectionFields from "./ConnectionFields.vue";

describe("SettingsConnectionFields", () => {
  function render(modelsLoaded = true) {
    return mount(ConnectionFields, {
      props: {
        aiBaseUrl: "https://provider.example/v1",
        aiModel: "private-model",
        models: ["model-a", "model-b"],
        authConfigured: true,
        modelsLoaded,
      },
    });
  }

  it.each([false, true])("accepts an unlisted model with modelsLoaded=%s", async (modelsLoaded) => {
    const wrapper = render(modelsLoaded);
    const modelField = wrapper.findAll("label").find((label) => /AI model/i.test(label.text()))!;
    const input = modelField.get("input");

    expect((input.element as HTMLInputElement).value).toBe("private-model");
    await input.setValue("another-private-model");

    expect(wrapper.emitted("update:aiModel")).toEqual([["another-private-model"]]);
  });

  it("accepts a replacement credential without exposing it as plain text", async () => {
    const wrapper = render();
    const input = wrapper.get("input[type='password']");

    expect((input.element as HTMLInputElement).value).toBe("");
    await input.setValue("test-only-provider-key");

    expect(wrapper.emitted("update:aiApiKey")).toEqual([["test-only-provider-key"]]);
    expect(wrapper.text()).not.toContain("test-only-provider-key");
  });

  it("emits null only for explicit removal", async () => {
    const wrapper = render();
    await wrapper.get("input[type='password']").setValue("temporary-key");
    await wrapper.setProps({ aiApiKey: "temporary-key" });
    await wrapper.get("input[type='password']").setValue("");
    expect(wrapper.emitted("update:aiApiKey")?.at(-1)).toEqual([undefined]);

    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("update:aiApiKey")?.at(-1)).toEqual([null]);
    await wrapper.setProps({ aiApiKey: null });
    expect((wrapper.get("input[type='password']").element as HTMLInputElement).value).toBe("");
  });
});
