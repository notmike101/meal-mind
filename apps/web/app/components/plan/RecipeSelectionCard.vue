<script setup lang="ts">
import type { RecipeSummaryDto } from "@mealmind/contracts";
import { Check, Clock, Users } from "@lucide/vue";

defineProps<{
  recipe: RecipeSummaryDto;
  selected: boolean;
  usedCount: number;
  actionLabel: string;
  disabled: boolean;
}>();
const emit = defineEmits<{ choose: [] }>();
</script>

<template>
  <article
    class="flex min-h-full flex-col overflow-hidden rounded-xl border bg-surface shadow-sm transition"
    :class="selected ? 'border-moss ring-2 ring-moss/20' : 'border-ink/10 hover:-translate-y-0.5 hover:shadow-md'"
  >
    <div class="relative">
      <PlanRecipePhoto :image-url="recipe.imageUrl" :title="recipe.title" />
      <span v-if="selected" class="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-moss px-3 py-1 text-xs font-semibold text-white">
        <Check :size="14" aria-hidden="true" /> Selected
      </span>
      <span v-else-if="usedCount" class="absolute left-3 top-3 rounded-full bg-strong/90 px-3 py-1 text-xs font-semibold text-strong-foreground">
        Used {{ usedCount }}× this week
      </span>
    </div>
    <div class="flex flex-1 flex-col p-4">
      <h3 class="text-lg font-semibold leading-snug">{{ recipe.title }}</h3>
      <p class="mt-2 line-clamp-3 text-sm leading-5 text-ink/65">{{ recipe.description }}</p>
      <div class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink/65">
        <span class="inline-flex items-center gap-1"><Clock :size="15" aria-hidden="true" /> {{ recipe.totalTimeMinutes }} min</span>
        <span class="inline-flex items-center gap-1"><Users :size="15" aria-hidden="true" /> {{ recipe.defaultServings }} servings</span>
      </div>
      <div v-if="recipe.tags.length" class="mt-3 flex flex-wrap gap-2">
        <span v-for="tag in recipe.tags.slice(0, 3)" :key="tag" class="rounded-full bg-field px-2.5 py-1 text-xs text-ink/65">{{ tag }}</span>
      </div>
      <div class="mt-auto flex items-center justify-between gap-3 pt-5">
        <NuxtLink :to="`/recipes/${recipe.id}`" class="focus-ring rounded-md px-2 py-2 text-sm font-semibold text-moss hover:bg-moss/10">
          Details
        </NuxtLink>
        <button
          type="button"
          :disabled="disabled || selected"
          class="focus-ring rounded-md px-4 py-2 text-sm font-semibold transition"
          :class="selected ? 'bg-moss/10 text-moss' : 'bg-strong text-strong-foreground hover:bg-strong/90'"
          @click="emit('choose')"
        >
          {{ selected ? "Selected" : actionLabel }}
        </button>
      </div>
    </div>
  </article>
</template>
