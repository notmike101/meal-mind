<script setup lang="ts">
const pantryStaples = defineModel<string>({ required: true });
</script>

<template>
  <label class="block space-y-2">
    <span class="text-sm font-medium">Pantry staples, one per line</span>
    <textarea v-model="pantryStaples" rows="7" class="focus-ring w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-ink" />
  </label>
</template>
