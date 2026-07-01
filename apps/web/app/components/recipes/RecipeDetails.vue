<script setup lang="ts">
import type { RecipeDto } from "@mealmind/contracts";
import { computed } from "vue";

const props = withDefaults(defineProps<{
  recipe: RecipeDto;
  headingId?: string;
  embedded?: boolean;
}>(), {
  headingId: undefined,
  embedded: false,
});

const totalTime = computed(() => (props.recipe.prepTimeMinutes ?? 0) + (props.recipe.cookTimeMinutes ?? 0));
</script>

<template>
  <div class="space-y-6">
    <section :class="embedded ? 'border-b border-ink/10 pb-5' : 'rounded-md bg-surface p-6 shadow-line'">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-sm font-medium uppercase tracking-wide text-moss">Recipe</p>
          <h1 :id="headingId" class="mt-2 text-3xl font-semibold text-ink">{{ recipe.title }}</h1>
          <p class="mt-3 max-w-3xl text-ink/70">{{ recipe.description }}</p>
        </div>
        <span class="w-fit rounded-md bg-field px-3 py-2 text-sm font-medium text-ink/70">
          {{ recipe.defaultServings }} servings
        </span>
      </div>
      <div class="mt-5">
        <RecipesRecipeMeta :suggested-slots="recipe.suggestedSlots" :total-time="totalTime" :tags="recipe.tags" />
      </div>
    </section>
    <div class="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <RecipesIngredientList :ingredients="recipe.ingredients" />
      <RecipesInstructionList :recipe="recipe" />
    </div>
  </div>
</template>
