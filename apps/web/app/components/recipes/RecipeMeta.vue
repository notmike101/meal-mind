<script setup lang="ts">
import { Clock, Tags, Utensils } from "@lucide/vue";

withDefaults(defineProps<{ suggestedSlots: string[]; totalTime: number; tags: string[]; showTags?: boolean }>(), {
  showTags: true,
});
</script>

<template>
  <div class="flex flex-wrap gap-2 text-sm text-ink/65">
    <span v-if="suggestedSlots.length" class="inline-flex items-center gap-1 rounded-md bg-field px-2 py-1">
      <Utensils :size="14" aria-hidden="true" /> {{ suggestedSlots.join(", ") }}
    </span>
    <span class="inline-flex items-center gap-1 rounded-md bg-field px-2 py-1">
      <Clock :size="14" aria-hidden="true" /> {{ totalTime }} min
    </span>
    <span v-for="tag in showTags ? tags : []" :key="tag" class="inline-flex items-center gap-1 rounded-md bg-field px-2 py-1">
      <Tags :size="14" aria-hidden="true" /> {{ tag }}
    </span>
  </div>
</template>
