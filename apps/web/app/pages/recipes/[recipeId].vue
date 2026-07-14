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
</script>

<template>
  <div v-if="recipe" class="mm-space-y-6">
    <NuxtLink
      to="/recipes"
      class="focus-ring inline-flex items-center mm-gap-2 rounded-md mm-px-2 mm-py-1 mm-text-sm font-semibold text-moss hover:bg-moss/10"
    >
      <ArrowLeft :size="16" aria-hidden="true" /> Recipes
    </NuxtLink>
    <RecipesRecipeDetails :recipe="recipe" />
  </div>
</template>
