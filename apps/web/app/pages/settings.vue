<script setup lang="ts">
import { callOnce } from "#app";
import { Asterisk } from "@lucide/vue";
import { useSettingsStore } from "~/stores/settings";

const settings = useSettingsStore();
await callOnce("settings-data", () => settings.fetchSettings(), { mode: "navigation" });
</script>

<template>
  <div class="mm-settings-page mm-space-y-6">
    <header class="flex flex-wrap items-end justify-between mm-gap-4">
      <div class="min-w-0">
        <p class="mm-eyebrow mm-mb-4">Built around your kitchen</p>
        <h1 class="mm-page-title">Local planner settings</h1>
        <p class="mm-mt-2 mm-text-sm text-steel">Configure your provider and household planning defaults.</p>
      </div>
      <div class="min-w-0 w-full sm:w-auto mm-space-y-2">
        <p id="appearance-heading" class="mm-text-sm font-semibold">Appearance</p>
        <div aria-labelledby="appearance-heading"><SettingsThemeToggle /></div>
      </div>
    </header>
    <section class="mm-editorial-banner" aria-label="Make the planner yours">
      <Asterisk class="mm-editorial-flourish" :size="64" :stroke-width="1" aria-hidden="true" />
      <p class="mm-eyebrow">Set your table</p>
      <h2>Make the planner <em>yours.</em></h2>
      <p class="mm-text-sm text-steel">Small preferences, better everyday decisions.</p>
    </section>
    <SettingsForm
      v-if="settings.data"
      :settings="settings.data.settings"
      :pantry-staples="settings.data.pantryStaples"
    />
  </div>
</template>
