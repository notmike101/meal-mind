<script setup lang="ts">
import { callOnce } from "#app";
import { Palette } from "@lucide/vue";
import { useSettingsStore } from "~/stores/settings";

const settings = useSettingsStore();
await callOnce("settings-data", () => settings.fetchSettings(), { mode: "navigation" });
</script>

<template>
  <div class="mm-space-y-6">
    <section class="border-b-2 border-ink pb-10">
      <PageHeading eyebrow="Settings" title="Local planner settings" description="Tune your planning experience, AI connection, portions, and pantry defaults." />
    </section>
    <section class="flex flex-col mm-gap-4 border-y border-line/40 bg-surface mm-p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div class="flex items-center mm-gap-3">
        <span class="flex h-11 w-11 items-center justify-center border border-ink text-ink">
          <Palette :size="20" aria-hidden="true" />
        </span>
        <div>
          <h2 class="mm-display mm-text-xl font-semibold">Appearance</h2>
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
