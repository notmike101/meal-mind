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
  <div class="grid w-full grid-cols-3 gap-1 rounded-xl bg-field p-1 sm:w-auto" aria-label="Theme preference">
    <button
      v-for="item in preferences"
      :key="item.value"
      type="button"
      :aria-label="item.label"
      :aria-pressed="theme.preference === item.value"
      :title="item.label"
      :class="theme.preference === item.value
        ? 'bg-surface text-ink shadow-sm ring-1 ring-line/20'
        : 'text-ink/55 hover:bg-surface/60 hover:text-ink'"
      class="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors"
      @click="theme.update(item.value)"
    >
      <component :is="item.icon" :size="16" aria-hidden="true" />
      <span>{{ item.shortLabel }}</span>
    </button>
  </div>
</template>
