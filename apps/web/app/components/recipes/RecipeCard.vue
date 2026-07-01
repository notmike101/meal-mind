<script setup lang="ts">
import type { RecipeSummaryDto } from "@mealmind/contracts";
import { ArrowRight, Tags } from "@lucide/vue";

defineProps<{ recipe: RecipeSummaryDto }>();
const emit = defineEmits<{ openDetails: [recipeId: string, trigger: globalThis.HTMLElement] }>();

function openDetails(event: globalThis.MouseEvent, recipeId: string) {
  emit("openDetails", recipeId, event.currentTarget as globalThis.HTMLElement);
}
</script>

<template>
  <article class="flex h-full flex-col overflow-hidden rounded-md bg-surface shadow-line">
    <a
      :href="`/recipes/${recipe.id}`"
      class="focus-ring flex h-full flex-1 flex-col rounded-md transition hover:bg-field/40"
      @click.exact.left.prevent="openDetails($event, recipe.id)"
    >
      <PlanRecipePhoto :image-url="recipe.imageUrl" :title="recipe.title" />
      <div class="flex flex-1 flex-col p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="text-lg font-semibold">{{ recipe.title }}</h2>
            <p class="mt-2 line-clamp-3 text-sm leading-5 text-ink/65">{{ recipe.description }}</p>
          </div>
          <span class="shrink-0 rounded-md bg-field px-2 py-1 text-xs font-medium text-ink/70">
            {{ recipe.defaultServings }} servings
          </span>
        </div>
        <div class="mt-4">
          <RecipesRecipeMeta
            :suggested-slots="recipe.suggestedSlots"
            :total-time="recipe.totalTimeMinutes"
            :tags="recipe.tags"
            :show-tags="false"
          />
        </div>
        <div v-if="recipe.tags.length" class="mt-3 flex flex-wrap gap-2 text-xs text-ink/65">
          <span v-for="tag in recipe.tags" :key="tag" class="inline-flex items-center gap-1 rounded-md bg-field px-2 py-1">
            <Tags :size="13" aria-hidden="true" /> {{ tag }}
          </span>
        </div>
        <div class="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-ink/10 pt-4 text-sm text-ink/60">
          <span class="min-w-0">{{ recipe.ingredientCount }} ingredients · {{ recipe.cookwareCount }} tools · {{ recipe.timerCount }} timers</span>
          <span class="ml-auto inline-flex shrink-0 items-center gap-2 rounded-md px-2 py-1 font-semibold text-moss">
            Details <ArrowRight :size="15" aria-hidden="true" />
          </span>
        </div>
      </div>
    </a>
  </article>
</template>
