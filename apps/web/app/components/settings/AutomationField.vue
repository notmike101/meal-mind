<script setup lang="ts">
const model = defineModel<boolean>({ required: true });
</script>

<template>
  <label class="flex min-h-control cursor-pointer items-start justify-between mm-gap-4">
    <span class="min-w-0">
      <span class="block mm-text-sm font-semibold text-ink">Automatically generate next week's plan</span>
      <span class="mm-mt-1 block mm-text-sm leading-relaxed text-steel">
        MealMind checks at startup and periodically while it is running. Existing plans are never replaced.
      </span>
      <span class="mm-mt-2 block mm-text-xs font-semibold" :class="model ? 'text-success' : 'text-muted'">
        {{ model ? "Automation enabled" : "Manual planning" }}
      </span>
    </span>
    <input v-model="model" type="checkbox" class="focus-ring mt-1 h-5 w-5 shrink-0 cursor-pointer rounded border-control accent-moss" />
  </label>
</template>
