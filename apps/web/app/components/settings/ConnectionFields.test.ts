import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ConnectionFields from "./ConnectionFields.vue";

describe("SettingsConnectionFields", () => {
  it("renders reported models and server authentication status", () => {
    const wrapper = mount(ConnectionFields, {
      props: {
        aiBaseUrl: "https://provider.example/v1",
        aiModel: "model-b",
        timezone: "America/Chicago",
        models: ["model-a", "model-b"],
        authConfigured: true,
        modelsLoaded: true,
      },
    });

    expect(wrapper.get("select").element.value).toBe("model-b");
    expect(wrapper.findAll("option").map((option) => option.text())).toContain("model-a");
    expect(wrapper.text()).toContain("Authentication token: configured on the server");
  });
});
