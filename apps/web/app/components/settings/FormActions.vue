<script setup lang="ts">
import { PlugZap, Save } from "@lucide/vue";

defineProps<{ busy: boolean; canSave: boolean }>();
const emit = defineEmits<{ save: []; testAi: [] }>();
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      type="button"
      :disabled="busy || !canSave"
      class="focus-ring inline-flex items-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white"
      @click="emit('save')"
    >
      <Save :size="16" aria-hidden="true" /> Save
    </button>
    <button
      type="button"
      :disabled="busy"
      class="focus-ring inline-flex items-center gap-2 rounded-md border border-ink/15 px-4 py-2 text-sm font-medium"
      @click="emit('testAi')"
    >
      <PlugZap :size="16" aria-hidden="true" /> Load models
    </button>
  </div>
</template>
