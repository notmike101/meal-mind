<script setup lang="ts">
const pantryStaples = defineModel<string>({ required: true });
</script>

<template>
  <label class="block mm-space-y-2">
    <span class="mm-text-sm font-medium">Pantry staples, one per line</span>
    <textarea v-model="pantryStaples" rows="7" class="focus-ring mm-field w-full mm-px-3 mm-py-2 text-ink" />
  </label>
</template>
