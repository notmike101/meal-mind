<script setup lang="ts">
const preferences = defineModel<string>("preferences", { required: true });
const varietyRules = defineModel<string>("varietyRules", { required: true });
</script>

<template>
  <label class="block space-y-2">
    <span class="text-sm font-medium">Planning preferences</span>
    <textarea v-model="preferences" rows="4" class="focus-ring w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink" />
  </label>
  <label class="block space-y-2">
    <span class="text-sm font-medium">Variety rules</span>
    <textarea v-model="varietyRules" rows="3" class="focus-ring w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink" />
  </label>
</template>
