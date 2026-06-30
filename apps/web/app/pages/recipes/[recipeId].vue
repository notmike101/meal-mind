<script setup lang="ts">
import { callOnce, useRoute } from "#app";
import { ArrowLeft } from "@lucide/vue";
import { createError } from "h3";
import { computed } from "vue";
import { useRecipesStore } from "~/stores/recipes";

const route = useRoute();
const recipes = useRecipesStore();
const recipeId = String(route.params.recipeId);
try {
  await callOnce(`recipe-${recipeId}`, () => recipes.fetchRecipe(recipeId), { mode: "navigation" });
} catch {
  throw createError({ statusCode: 404, statusMessage: "Recipe not found." });
}
const recipe = computed(() => recipes.details[recipeId]);
const totalTime = computed(() => (recipe.value?.prepTimeMinutes ?? 0) + (recipe.value?.cookTimeMinutes ?? 0));
</script>

<template>
  <div v-if="recipe" class="space-y-6">
    <NuxtLink
      to="/recipes"
      class="focus-ring inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-moss hover:bg-moss/10"
    >
      <ArrowLeft :size="16" aria-hidden="true" /> Recipes
    </NuxtLink>
    <section class="rounded-md bg-surface p-6 shadow-line">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-sm font-medium uppercase tracking-wide text-moss">Recipe</p>
          <h1 class="mt-2 text-3xl font-semibold text-ink">{{ recipe.title }}</h1>
          <p class="mt-3 max-w-3xl text-ink/70">{{ recipe.description }}</p>
        </div>
        <span class="w-fit rounded-md bg-field px-3 py-2 text-sm font-medium text-ink/70">
          {{ recipe.defaultServings }} servings
        </span>
      </div>
      <div class="mt-5">
        <RecipesRecipeMeta :meal-types="recipe.mealTypes" :total-time="totalTime" :tags="recipe.tags" />
      </div>
    </section>
    <div class="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <RecipesIngredientList :ingredients="recipe.ingredients" />
      <RecipesInstructionList :recipe="recipe" />
    </div>
  </div>
</template>
