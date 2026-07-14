<script setup lang="ts">
import { callOnce } from "#app";
import { Palette } from "@lucide/vue";
import { useSettingsStore } from "~/stores/settings";

const settings = useSettingsStore();
await callOnce("settings-data", () => settings.fetchSettings(), { mode: "navigation" });
</script>

<template>
  <div class="mm-space-y-6">
    <section class="mm-panel mm-p-6 sm:p-8">
      <PageHeading eyebrow="Settings" title="Local planner settings" description="Tune your planning experience, AI connection, portions, and pantry defaults." />
    </section>
    <section class="mm-panel flex flex-col mm-gap-4 mm-p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div class="flex items-center mm-gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-steel/10 text-steel">
          <Palette :size="21" aria-hidden="true" />
        </span>
        <div>
          <h2 class="mm-text-lg font-bold">Appearance</h2>
          <p class="mm-mt-1 mm-text-sm text-ink/60">Choose the theme that feels best.</p>
        </div>
      </div>
      <SettingsThemeToggle />
    </section>
    <SettingsForm
      v-if="settings.data"
      :settings="settings.data.settings"
      :pantry-staples="settings.data.pantryStaples"
    />
  </div>
</template>
