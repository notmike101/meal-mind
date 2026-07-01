<script setup lang="ts">
const servings = defineModel<number>("servings", { required: true });
const weeklyMealCount = defineModel<number>("weeklyMealCount", { required: true });
</script>

<template>
  <div class="grid grid-cols-2 mm-gap-3">
    <label class="mm-space-y-2">
      <span class="mm-text-sm font-medium">Default meal servings</span>
      <input v-model.number="servings" type="number" min="1" max="12" class="focus-ring w-full rounded-md border border-ink/15 bg-surface mm-px-3 mm-py-2 text-ink" />
    </label>
    <label class="mm-space-y-2">
      <span class="mm-text-sm font-medium">Weekly meals</span>
      <input v-model.number="weeklyMealCount" type="number" min="1" class="focus-ring w-full rounded-md border border-ink/15 bg-surface mm-px-3 mm-py-2 text-ink" />
    </label>
  </div>
</template>
