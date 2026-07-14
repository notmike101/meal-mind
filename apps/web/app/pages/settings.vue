<script setup lang="ts">
import { callOnce } from "#app";
import { Palette } from "@lucide/vue";
import { useSettingsStore } from "~/stores/settings";

const settings = useSettingsStore();
await callOnce("settings-data", () => settings.fetchSettings(), { mode: "navigation" });
</script>

<template>
  <div class="space-y-8">
    <section>
      <PageHeading eyebrow="Settings" title="Local planner settings" description="Tune your planning experience, AI connection, portions, and pantry defaults." />
    </section>
    <section class="flex flex-col gap-5 rounded-2xl border border-line/25 bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div class="flex items-center gap-4">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-field text-moss">
          <Palette :size="20" aria-hidden="true" />
        </span>
        <div>
          <h2 class="text-lg font-semibold text-ink">Appearance</h2>
          <p class="mt-1 text-sm text-ink/60">Match your workspace or choose a fixed theme.</p>
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
