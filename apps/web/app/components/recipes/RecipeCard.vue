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
  <article class="mm-panel mm-interactive group flex h-full flex-col overflow-hidden">
    <a
      :href="`/recipes/${recipe.id}`"
      class="focus-ring flex h-full flex-1 flex-col rounded-[1.2rem]"
      @click.exact.left.prevent="openDetails($event, recipe.id)"
    >
      <PlanRecipePhoto :image-url="recipe.imageUrl" :title="recipe.title" />
      <div class="flex flex-1 flex-col mm-p-5">
        <div class="flex items-start justify-between mm-gap-3">
          <div class="min-w-0">
            <h2 class="mm-text-lg font-bold leading-snug transition-colors group-hover:text-moss">{{ recipe.title }}</h2>
            <p class="mm-mt-2 line-clamp-3 mm-text-sm mm-leading-5 text-ink/60">{{ recipe.description }}</p>
          </div>
          <span class="shrink-0 rounded-full bg-field mm-px-3 mm-py-1 mm-text-xs font-bold text-ink/60">
            {{ recipe.defaultServings }} servings
          </span>
        </div>
        <div class="mm-mt-4">
          <RecipesRecipeMeta
            :suggested-slots="recipe.suggestedSlots"
            :total-time="recipe.totalTimeMinutes"
            :tags="recipe.tags"
            :show-tags="false"
          />
        </div>
        <div v-if="recipe.tags.length" class="mm-mt-3 flex flex-wrap mm-gap-2 mm-text-xs text-ink/65">
          <span v-for="tag in recipe.tags" :key="tag" class="inline-flex items-center mm-gap-1 rounded-full border border-line/10 bg-field/70 mm-px-2 mm-py-1">
            <Tags :size="13" aria-hidden="true" /> {{ tag }}
          </span>
        </div>
        <div class="mt-auto flex flex-wrap items-center justify-between mm-gap-x-2 mm-gap-y-1 border-t border-line/10 mm-pt-4 mm-text-sm text-ink/55">
          <span class="min-w-0">{{ recipe.ingredientCount }} ingredients · {{ recipe.cookwareCount }} tools · {{ recipe.timerCount }} timers</span>
          <span class="ml-auto inline-flex shrink-0 items-center mm-gap-2 rounded-md mm-px-2 mm-py-1 font-bold text-moss">
            Details <ArrowRight class="transition-transform group-hover:translate-x-1" :size="15" aria-hidden="true" />
          </span>
        </div>
      </div>
    </a>
  </article>
</template>
