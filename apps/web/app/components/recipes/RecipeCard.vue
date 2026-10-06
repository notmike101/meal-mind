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
  <article class="mm-card mm-interactive group flex min-w-0 h-full flex-col overflow-hidden">
    <a
      :href="`/recipes/${recipe.id}`"
      class="focus-ring flex h-full flex-1 flex-col rounded-xl"
      @click.exact.left.prevent="openDetails($event, recipe.id)"
    >
      <div class="relative overflow-hidden">
        <PlanRecipePhoto :image-url="recipe.imageUrl" :title="recipe.title" />
        <span class="absolute right-3 top-3 max-w-full rounded-full border border-line bg-surface px-3 py-1.5 mm-text-xs font-semibold text-ink">
          {{ recipe.defaultServings }} servings
        </span>
      </div>
      <div class="flex flex-1 flex-col mm-p-5">
        <h2 class="mm-display break-words mm-text-xl font-semibold leading-snug tracking-tight text-ink transition-colors group-hover:text-moss">{{ recipe.title }}</h2>
        <p class="mm-mt-2 line-clamp-2 mm-text-sm mm-leading-5 text-steel">{{ recipe.description }}</p>
        <div class="mm-mt-4">
          <RecipesRecipeMeta
            :suggested-slots="recipe.suggestedSlots"
            :total-time="recipe.totalTimeMinutes"
            :tags="recipe.tags"
            :show-tags="false"
          />
        </div>
        <div v-if="recipe.tags.length" class="mm-mt-3 flex flex-wrap mm-gap-2 mm-text-xs text-steel">
          <span v-for="tag in recipe.tags.slice(0, 3)" :key="tag" class="inline-flex max-w-full break-words items-center mm-gap-1 rounded-full bg-field mm-px-2.5 mm-py-1 font-medium">
            <Tags :size="13" class="shrink-0" aria-hidden="true" />
            <span class="min-w-0 break-words">{{ tag }}</span>
          </span>
        </div>
        <div class="mt-auto flex flex-wrap items-center justify-between mm-gap-x-2 mm-gap-y-1 border-t border-line mm-pt-4 mm-text-xs font-medium text-steel">
          <span class="min-w-0">{{ recipe.ingredientCount }} ingredients · {{ recipe.cookwareCount }} tools · {{ recipe.timerCount }} timers</span>
          <span class="ml-auto inline-flex shrink-0 items-center mm-gap-2 rounded-lg font-bold text-moss">
            Details <ArrowRight :size="15" aria-hidden="true" />
          </span>
        </div>
      </div>
    </a>
  </article>
</template>
