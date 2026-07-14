<script setup lang="ts">
const model = defineModel<boolean>({ required: true });
</script>

<template>
  <label class="mm-card flex cursor-pointer items-start justify-between mm-gap-4 mm-p-4 transition-colors hover:border-moss/30">
    <span>
      <span class="block mm-text-sm font-medium">Automatically generate next week's plan</span>
      <span class="mm-mt-1 block mm-text-sm text-ink/60">
        MealMind checks at startup and periodically while it is running. Existing plans are never replaced.
      </span>
    </span>
    <input
      v-model="model"
      type="checkbox"
      class="focus-ring mm-mt-1 h-5 w-5 shrink-0 cursor-pointer accent-moss"
    />
  </label>
</template>
