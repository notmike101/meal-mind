<script setup lang="ts">
const aiBaseUrl = defineModel<string>("aiBaseUrl", { required: true });
const aiModel = defineModel<string>("aiModel", { required: true });
const timezone = defineModel<string>("timezone", { required: true });
</script>

<template>
  <label class="space-y-2">
    <span class="text-sm font-medium">AI base URL</span>
    <input v-model="aiBaseUrl" class="focus-ring w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink" />
  </label>
  <label class="space-y-2">
    <span class="text-sm font-medium">AI model</span>
    <input v-model="aiModel" class="focus-ring w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink" />
  </label>
  <label class="space-y-2">
    <span class="text-sm font-medium">Timezone</span>
    <input v-model="timezone" class="focus-ring w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink" />
  </label>
</template>
