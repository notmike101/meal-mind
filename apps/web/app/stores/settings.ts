import type { SettingsUpdateRequest } from "@mealmind/contracts";
import type { SettingsWithPantryDto } from "@mealmind/contracts";
import { defineStore } from "pinia";
import { apiRequest } from "~/composables/use-api";

type AiModelsResponse = { data?: unknown[] };

export const useSettingsStore = defineStore("settings", {
  state: () => ({ data: null as SettingsWithPantryDto | null }),
  actions: {
    async fetchSettings() {
      this.data = await apiRequest<SettingsWithPantryDto>("/api/settings");
    },
    async save(input: SettingsUpdateRequest) {
      await apiRequest("/api/settings", { method: "PATCH", body: input });
      await this.fetchSettings();
    },
    async testAi() {
      return apiRequest<AiModelsResponse>("/api/settings/test-ai", { method: "POST" });
    },
  },
});
