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
  <article class="group flex h-full flex-col overflow-hidden rounded-2xl border border-line/20 bg-surface shadow-sm transition duration-200 hover:-translate-y-1 hover:border-moss/35 hover:shadow-xl">
    <a
      :href="`/recipes/${recipe.id}`"
      class="focus-ring flex h-full flex-1 flex-col rounded-2xl"
      @click.exact.left.prevent="openDetails($event, recipe.id)"
    >
      <div class="relative overflow-hidden">
        <PlanRecipePhoto :image-url="recipe.imageUrl" :title="recipe.title" />
        <span class="absolute right-3 top-3 rounded-full border border-white/40 bg-ink/80 px-3 py-1.5 mm-text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
          {{ recipe.defaultServings }} servings
        </span>
      </div>
      <div class="flex flex-1 flex-col mm-p-5">
        <h2 class="mm-display mm-text-xl font-bold leading-snug tracking-[-0.025em] text-ink transition-colors group-hover:text-moss">{{ recipe.title }}</h2>
        <p class="mm-mt-2 line-clamp-2 mm-text-sm mm-leading-5 text-ink/65">{{ recipe.description }}</p>
        <div class="mm-mt-4">
          <RecipesRecipeMeta
            :suggested-slots="recipe.suggestedSlots"
            :total-time="recipe.totalTimeMinutes"
            :tags="recipe.tags"
            :show-tags="false"
          />
        </div>
        <div v-if="recipe.tags.length" class="mm-mt-3 flex flex-wrap mm-gap-2 mm-text-xs text-ink/65">
          <span v-for="tag in recipe.tags.slice(0, 3)" :key="tag" class="inline-flex items-center mm-gap-1 rounded-full bg-field mm-px-2.5 mm-py-1 font-medium">
            <Tags :size="13" aria-hidden="true" /> {{ tag }}
          </span>
        </div>
        <div class="mt-auto flex flex-wrap items-center justify-between mm-gap-x-2 mm-gap-y-1 border-t border-line/20 mm-pt-4 mm-text-xs font-medium text-ink/60">
          <span class="min-w-0">{{ recipe.ingredientCount }} ingredients · {{ recipe.cookwareCount }} tools · {{ recipe.timerCount }} timers</span>
          <span class="ml-auto inline-flex shrink-0 items-center mm-gap-2 rounded-lg font-bold text-moss">
            Details <ArrowRight class="transition-transform group-hover:translate-x-1" :size="15" aria-hidden="true" />
          </span>
        </div>
      </div>
    </a>
  </article>
</template>
