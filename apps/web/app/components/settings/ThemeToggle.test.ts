import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { useThemeStore } from "~/stores/theme";
import ThemeToggle from "./ThemeToggle.vue";

describe("ThemeToggle", () => {
  it("updates the shared theme preference", async () => {
    const wrapper = mount(ThemeToggle, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
      },
    });
    const store = useThemeStore();
    await wrapper.get('button[aria-label="Use light theme"]').trigger("click");
    expect(store.update).toHaveBeenCalledWith("light");
    expect(store.preference).toBe("light");
  });
});
