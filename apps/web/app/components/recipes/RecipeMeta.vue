<script setup lang="ts">
import { Clock, Tags, Utensils } from "@lucide/vue";

withDefaults(defineProps<{ suggestedSlots: string[]; totalTime: number; tags: string[]; showTags?: boolean }>(), {
  showTags: true,
});
</script>

<template>
  <div class="flex flex-wrap mm-gap-2 mm-text-sm text-ink/65">
    <span v-if="suggestedSlots.length" class="inline-flex items-center mm-gap-1 rounded-md bg-field mm-px-2 mm-py-1">
      <Utensils :size="14" aria-hidden="true" /> {{ suggestedSlots.join(", ") }}
    </span>
    <span class="inline-flex items-center mm-gap-1 rounded-md bg-field mm-px-2 mm-py-1">
      <Clock :size="14" aria-hidden="true" /> {{ totalTime }} min
    </span>
    <span v-for="tag in showTags ? tags : []" :key="tag" class="inline-flex items-center mm-gap-1 rounded-md bg-field mm-px-2 mm-py-1">
      <Tags :size="14" aria-hidden="true" /> {{ tag }}
    </span>
  </div>
</template>
