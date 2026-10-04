<script setup lang="ts">
import { callOnce } from "#app";
import { useSettingsStore } from "~/stores/settings";

const settings = useSettingsStore();
await callOnce("settings-data", () => settings.fetchSettings(), { mode: "navigation" });
</script>

<template>
  <div class="mm-space-y-6">
    <PageHeading eyebrow="Settings" title="Local planner settings" description="Tune your planning experience, AI connection, portions, and pantry defaults." />
    <SectionPanel title="Appearance" help="Match your workspace or choose a fixed theme.">
      <SettingsThemeToggle />
    </SectionPanel>
    <SettingsForm
      v-if="settings.data"
      :settings="settings.data.settings"
      :pantry-staples="settings.data.pantryStaples"
    />
  </div>
</template>
