<script setup lang="ts">
const aiBaseUrl = defineModel<string>("aiBaseUrl", { required: true });
const aiModel = defineModel<string>("aiModel", { required: true });
const timezone = defineModel<string>("timezone", { required: true });
defineProps<{ models: string[]; authConfigured: boolean; modelsLoaded: boolean }>();
</script>

<template>
  <label class="space-y-2">
    <span class="text-sm font-medium">AI base URL</span>
    <input v-model="aiBaseUrl" class="focus-ring w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink" />
  </label>
  <label class="space-y-2">
    <span class="text-sm font-medium">AI model</span>
    <select
      v-model="aiModel"
      class="focus-ring w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink"
    >
      <option value="" disabled>{{ modelsLoaded ? "Select a reported model" : "Load models to change selection" }}</option>
      <option v-for="model in models" :key="model" :value="model">{{ model }}</option>
    </select>
    <span class="block text-xs text-ink/55">
      Authentication token: {{ authConfigured ? "configured on the server" : "not configured (optional)" }}
    </span>
  </label>
  <label class="space-y-2">
    <span class="text-sm font-medium">Timezone</span>
    <input v-model="timezone" class="focus-ring w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink" />
  </label>
</template>
