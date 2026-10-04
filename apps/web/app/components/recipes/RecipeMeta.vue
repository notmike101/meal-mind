<script setup lang="ts">
import { Clock, Tags, Utensils } from "@lucide/vue";

withDefaults(defineProps<{ suggestedSlots: string[]; totalTime: number; tags: string[]; showTags?: boolean }>(), {
  showTags: true,
});
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 text-sm text-steel" aria-label="Recipe details">
    <span v-if="suggestedSlots.length" class="inline-flex max-w-full break-words min-h-9 items-center gap-2 rounded-full border border-line bg-field px-3 py-1.5 font-medium">
      <Utensils :size="15" class="shrink-0 text-moss" aria-hidden="true" />
      <span class="min-w-0 break-words">{{ suggestedSlots.join(", ") }}</span>
    </span>
    <span class="inline-flex max-w-full break-words min-h-9 items-center gap-2 rounded-full border border-line bg-field px-3 py-1.5 font-medium">
      <Clock :size="15" class="shrink-0 text-moss" aria-hidden="true" />
      <span class="min-w-0 break-words">{{ totalTime > 0 ? `${totalTime} min` : "Time not listed" }}</span>
    </span>
    <span v-for="tag in showTags ? tags : []" :key="tag" class="inline-flex max-w-full break-words min-h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-medium">
      <Tags :size="15" class="shrink-0 text-steel" aria-hidden="true" />
      <span class="min-w-0 break-words">{{ tag }}</span>
    </span>
  </div>
</template>
