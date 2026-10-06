<script setup lang="ts">
import { Monitor, Moon, Sun } from "@lucide/vue";
import { useThemeStore, type ThemePreference } from "~/stores/theme";

const theme = useThemeStore();
const preferences: Array<{ value: ThemePreference; label: string; shortLabel: string; icon: typeof Monitor }> = [
  { value: "system", label: "Use system theme", shortLabel: "System", icon: Monitor },
  { value: "light", label: "Use light theme", shortLabel: "Light", icon: Sun },
  { value: "dark", label: "Use dark theme", shortLabel: "Dark", icon: Moon },
];
</script>

<template>
  <div class="grid w-full max-w-lg grid-cols-3 gap-1 rounded-lg bg-field p-1" aria-label="Theme preference">
    <button
      v-for="item in preferences"
      :key="item.value"
      type="button"
      :aria-label="item.label"
      :aria-pressed="theme.preference === item.value"
      :title="item.label"
      :class="theme.preference === item.value
        ? 'bg-strong text-strong-foreground'
        : 'text-steel hover:bg-surface hover:text-ink'"
      class="focus-ring inline-flex min-h-control items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors"
      @click="theme.update(item.value)"
    >
      <component :is="item.icon" :size="16" aria-hidden="true" />
      <span>{{ item.shortLabel }}</span>
    </button>
  </div>
</template>
