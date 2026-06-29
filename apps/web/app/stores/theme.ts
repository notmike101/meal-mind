import { defineStore } from "pinia";

export type ThemePreference = "system" | "light" | "dark";

const storageKey = "mealmind-theme";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export const useThemeStore = defineStore("theme", {
  state: () => ({
    preference: "system" as ThemePreference,
    initialized: false,
  }),
  actions: {
    initialize() {
      if (!import.meta.client || this.initialized) return;
      const stored = window.localStorage.getItem(storageKey);
      this.preference = isThemePreference(stored) ? stored : "system";
      this.initialized = true;
      this.apply();
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (this.preference === "system") this.apply();
      });
    },
    update(preference: ThemePreference) {
      this.preference = preference;
      if (import.meta.client) {
        window.localStorage.setItem(storageKey, preference);
        this.apply();
      }
    },
    apply() {
      if (!import.meta.client) return;
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.dataset.theme = this.preference === "system" ? systemTheme : this.preference;
    },
  },
});
