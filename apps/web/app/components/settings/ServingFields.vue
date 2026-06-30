<script setup lang="ts">
const lunch = defineModel<number>("lunch", { required: true });
const dinner = defineModel<number>("dinner", { required: true });
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <label class="space-y-2">
      <span class="text-sm font-medium">Lunch servings</span>
      <input v-model.number="lunch" type="number" min="1" max="12" class="focus-ring w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink" />
    </label>
    <label class="space-y-2">
      <span class="text-sm font-medium">Dinner servings</span>
      <input v-model.number="dinner" type="number" min="1" max="12" class="focus-ring w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink" />
    </label>
  </div>
</template>
