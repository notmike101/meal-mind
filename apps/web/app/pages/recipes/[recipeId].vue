<script setup lang="ts">
import { callOnce, useRoute } from "#app";
import { ArrowLeft } from "@lucide/vue";
import { createError } from "h3";
import { computed, ref } from "vue";
import { useRecipesStore } from "~/stores/recipes";

const route = useRoute();
const recipes = useRecipesStore();
const recipeId = String(route.params.recipeId);
const servings = ref(2);
try {
  await callOnce(`recipe-${recipeId}-servings-2`, () => recipes.fetchRecipe(recipeId, servings.value), { mode: "navigation" });
} catch {
  throw createError({ statusCode: 404, statusMessage: "Recipe not found." });
}
const recipe = computed(() => recipes.details[recipeId]);
const loading = ref(false);
const error = ref<string | null>(null);

async function updateServings(nextServings: number) {
  if (loading.value || nextServings === servings.value) return;
  loading.value = true;
  error.value = null;
  try {
    await recipes.fetchRecipe(recipeId, nextServings);
    servings.value = nextServings;
  } catch {
    error.value = "Recipe servings could not be updated.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div v-if="recipe" class="mm-space-y-6">
    <NuxtLink
      to="/recipes"
      class="focus-ring inline-flex items-center mm-gap-2 rounded-md mm-px-2 mm-py-1 mm-text-sm font-semibold text-moss hover:bg-moss/10"
    >
      <ArrowLeft :size="16" aria-hidden="true" /> Recipes
    </NuxtLink>
    <RecipesRecipeDetails
      :recipe="recipe"
      :servings="servings"
      :disabled="loading"
      @update-servings="updateServings"
    />
    <p v-if="error" role="alert" class="mm-text-sm text-tomato">{{ error }}</p>
  </div>
</template>
