<script setup lang="ts">
import { callOnce } from "#app";
import { useRecipeModal } from "~/composables/use-recipe-modal";
import { useRecipesStore } from "~/stores/recipes";

const recipes = useRecipesStore();
const recipeModal = useRecipeModal();
await callOnce("recipe-catalog", () => recipes.fetchCatalog(), { mode: "navigation" });

function openRecipe(recipeId: string, trigger: globalThis.HTMLElement) {
  void recipeModal.openRecipe(recipeId, 2, trigger);
}
</script>

<template>
  <div class="mm-space-y-6">
    <PageHeading eyebrow="Recipes" title="CookLang recipe library" description="Valid local recipes available for planning." />
    <RecipesInvalidRecipeNotice
      v-if="recipes.catalog?.invalidRecipes.length"
      :invalid-recipes="recipes.catalog.invalidRecipes"
    />
    <section class="grid mm-gap-4 sm:grid-cols-2 md:grid-cols-3">
      <RecipesRecipeCard
        v-for="recipe in recipes.catalog?.recipes ?? []"
        :key="recipe.id"
        :recipe="recipe"
        @open-details="openRecipe"
      />
    </section>
    <div
      v-if="recipes.catalog?.recipes.length === 0"
      class="rounded-md border border-dashed border-ink/20 bg-surface mm-p-6 text-ink/70"
    >
      No valid recipes found.
    </div>
  </div>
</template>
