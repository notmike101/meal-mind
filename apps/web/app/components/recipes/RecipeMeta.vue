<script setup lang="ts">
import { Clock, Tags, Utensils } from "@lucide/vue";

withDefaults(defineProps<{ suggestedSlots: string[]; totalTime: number; tags: string[]; showTags?: boolean }>(), {
  showTags: true,
});
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 text-sm text-ink/70" aria-label="Recipe details">
    <span v-if="suggestedSlots.length" class="inline-flex min-h-9 items-center gap-2 rounded-full border border-line/20 bg-field px-3 py-1.5 font-medium">
      <Utensils :size="15" class="shrink-0 text-moss" aria-hidden="true" />
      <span>{{ suggestedSlots.join(", ") }}</span>
    </span>
    <span class="inline-flex min-h-9 items-center gap-2 rounded-full border border-line/20 bg-field px-3 py-1.5 font-medium">
      <Clock :size="15" class="shrink-0 text-moss" aria-hidden="true" />
      <span>{{ totalTime > 0 ? `${totalTime} min` : "Time not listed" }}</span>
    </span>
    <span v-for="tag in showTags ? tags : []" :key="tag" class="inline-flex min-h-9 items-center gap-2 rounded-full border border-line/20 bg-surface px-3 py-1.5 font-medium">
      <Tags :size="15" class="shrink-0 text-tomato" aria-hidden="true" />
      <span>{{ tag }}</span>
    </span>
  </div>
</template>
