<script setup lang="ts">
import type { RecipeSummaryDto } from "@mealmind/contracts";
import { ArrowRight, Tags } from "@lucide/vue";

defineProps<{ recipe: RecipeSummaryDto }>();
</script>

<template>
  <article class="rounded-md bg-surface p-5 shadow-line">
    <div class="flex min-h-full flex-col">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">{{ recipe.title }}</h2>
          <p class="mt-2 text-sm leading-6 text-ink/65">{{ recipe.description }}</p>
        </div>
        <span class="rounded-md bg-field px-2 py-1 text-xs font-medium text-ink/70">
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
      <div class="mt-5 flex items-center justify-between border-t border-ink/10 pt-4 text-sm text-ink/60">
        <span>{{ recipe.ingredientCount }} ingredients · {{ recipe.cookwareCount }} tools · {{ recipe.timerCount }} timers</span>
        <NuxtLink
          :to="`/recipes/${recipe.id}`"
          class="focus-ring inline-flex items-center gap-2 rounded-md px-2 py-1 font-semibold text-moss hover:bg-moss/10"
        >
          Details <ArrowRight :size="15" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
  </article>
</template>
