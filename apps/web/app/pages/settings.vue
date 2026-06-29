<script setup lang="ts">
import { callOnce } from "#app";
import { useSettingsStore } from "~/stores/settings";

const settings = useSettingsStore();
await callOnce("settings-data", () => settings.fetchSettings(), { mode: "navigation" });
</script>

<template>
  <div class="space-y-6">
    <PageHeading eyebrow="Settings" title="Local planner settings" description="AI access, preferences, portions, and pantry staples." />
    <section class="flex flex-col gap-3 rounded-md bg-surface p-5 shadow-line sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-semibold">Appearance</h2>
        <p class="mt-1 text-sm text-ink/65">Theme</p>
      </div>
      <SettingsThemeToggle />
    </section>
    <SettingsSettingsForm
      v-if="settings.data"
      :settings="settings.data.settings"
      :pantry-staples="settings.data.pantryStaples"
    />
  </div>
</template>
