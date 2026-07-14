<script setup lang="ts">
import { Monitor, Moon, Sun } from "@lucide/vue";
import { useThemeStore, type ThemePreference } from "~/stores/theme";

const theme = useThemeStore();
const preferences: Array<{ value: ThemePreference; label: string; icon: typeof Monitor }> = [
  { value: "system", label: "Use system theme", icon: Monitor },
  { value: "light", label: "Use light theme", icon: Sun },
  { value: "dark", label: "Use dark theme", icon: Moon },
];
</script>

<template>
  <div class="flex mm-h-10 items-center rounded-md border border-ink/10 bg-field mm-p-1" aria-label="Theme preference">
    <button
      v-for="item in preferences"
      :key="item.value"
      type="button"
      :aria-label="item.label"
      :aria-pressed="theme.preference === item.value"
      :title="item.label"
        :class="theme.preference === item.value
          ? 'focus-ring flex mm-h-8 mm-w-8 items-center justify-center rounded-md bg-surface text-ink shadow-line'
          : 'focus-ring flex mm-h-8 mm-w-8 items-center justify-center rounded-md text-ink/60 hover:bg-surface hover:text-ink'"
      @click="theme.update(item.value)"
    >
      <component :is="item.icon" :size="16" aria-hidden="true" />
    </button>
  </div>
</template>
