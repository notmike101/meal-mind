<script setup lang="ts">
import { PlugZap, Save } from "@lucide/vue";

defineProps<{ busy: boolean; canSave: boolean }>();
const emit = defineEmits<{ save: []; testAi: [] }>();
</script>

<template>
  <div class="flex flex-wrap mm-gap-2">
    <button
      type="button"
      :disabled="busy || !canSave"
      class="focus-ring mm-button-primary inline-flex items-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-bold"
      @click="emit('save')"
    >
      <Save :size="16" aria-hidden="true" /> Save
    </button>
    <button
      type="button"
      :disabled="busy"
      class="focus-ring mm-button-secondary inline-flex items-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-semibold"
      @click="emit('testAi')"
    >
      <PlugZap :size="16" aria-hidden="true" /> Load models
    </button>
  </div>
</template>
