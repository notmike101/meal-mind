<script setup lang="ts">
import type { RecipeSummaryDto } from "@mealmind/contracts";
import { Check, Clock, Users } from "@lucide/vue";

const props = defineProps<{
  recipe: RecipeSummaryDto;
  selected: boolean;
  usedCount: number;
  actionLabel: string;
  disabled: boolean;
}>();
const emit = defineEmits<{
  choose: [];
  openDetails: [recipeId: string, trigger: globalThis.HTMLElement];
}>();

function openDetails(event: globalThis.MouseEvent) {
  emit("openDetails", props.recipe.id, event.currentTarget as globalThis.HTMLElement);
}
</script>

<template>
  <article
    class="flex min-h-full flex-col overflow-hidden rounded-2xl border bg-surface shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
    :class="selected ? 'border-moss ring-2 ring-moss/15' : 'border-line/20 hover:border-moss/35'"
  >
    <a :href="`/recipes/${recipe.id}`" class="focus-ring group flex flex-1 flex-col rounded-t-2xl" @click.exact.left.prevent="openDetails">
      <div class="relative">
        <PlanRecipePhoto :image-url="recipe.imageUrl" :title="recipe.title" />
        <span v-if="selected" class="absolute left-3 top-3 inline-flex items-center mm-gap-1 rounded-full bg-moss mm-px-3 mm-py-1.5 mm-text-xs font-semibold text-white shadow-lg">
          <Check :size="14" aria-hidden="true" /> Selected
        </span>
        <span v-else-if="usedCount" class="absolute left-3 top-3 rounded-full bg-ink/80 mm-px-3 mm-py-1.5 mm-text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
          Used {{ usedCount }}× this week
        </span>
      </div>
      <div class="flex flex-1 flex-col mm-px-4 mm-pt-4">
        <h3 class="mm-display mm-text-xl font-bold mm-leading-snug transition-colors group-hover:text-moss">{{ recipe.title }}</h3>
        <p class="mm-mt-2 line-clamp-3 mm-text-sm mm-leading-5 text-ink/65">{{ recipe.description }}</p>
        <div class="mm-mt-4 flex flex-wrap mm-gap-x-4 mm-gap-y-2 mm-text-sm text-ink/65">
          <span class="inline-flex items-center mm-gap-1"><Clock :size="15" aria-hidden="true" /> {{ recipe.totalTimeMinutes }} min</span>
          <span class="inline-flex items-center mm-gap-1"><Users :size="15" aria-hidden="true" /> {{ recipe.defaultServings }} servings</span>
        </div>
        <div v-if="recipe.tags.length" class="mm-mt-3 flex flex-wrap mm-gap-2">
          <span v-for="tag in recipe.tags.slice(0, 3)" :key="tag" class="rounded-full bg-field mm-px-2.5 mm-py-1 mm-text-xs font-medium text-ink/65">{{ tag }}</span>
        </div>
      </div>
    </a>
    <div class="mt-auto flex items-center justify-between mm-gap-3 border-t border-line/30 mm-p-4 mm-pt-4">
      <a :href="`/recipes/${recipe.id}`" class="focus-ring rounded-lg mm-px-2 mm-py-2 mm-text-sm font-semibold text-moss hover:bg-moss/10" @click.exact.left.prevent="openDetails">Details</a>
      <button
        type="button"
        :disabled="disabled || selected"
        class="focus-ring min-h-10 rounded-xl border mm-px-4 mm-py-2 mm-text-sm font-semibold transition-colors"
        :class="selected ? 'border-moss text-moss' : 'border-strong bg-strong text-strong-foreground hover:opacity-90'"
        @click="emit('choose')"
      >
        {{ selected ? "Selected" : actionLabel }}
      </button>
    </div>
  </article>
</template>
