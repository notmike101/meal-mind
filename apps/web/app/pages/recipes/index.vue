<script setup lang="ts">
import { callOnce } from "#app";
import { useRecipesStore } from "~/stores/recipes";

const recipes = useRecipesStore();
await callOnce("recipe-catalog", () => recipes.fetchCatalog(), { mode: "navigation" });
</script>

<template>
  <div class="space-y-6">
    <PageHeading eyebrow="Recipes" title="CookLang recipe library" description="Valid local recipes available for planning." />
    <RecipesInvalidRecipeNotice
      v-if="recipes.catalog?.invalidRecipes.length"
      :invalid-recipes="recipes.catalog.invalidRecipes"
    />
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <RecipesRecipeCard v-for="recipe in recipes.catalog?.recipes ?? []" :key="recipe.id" :recipe="recipe" />
    </section>
    <div
      v-if="recipes.catalog?.recipes.length === 0"
      class="rounded-md border border-dashed border-ink/20 bg-surface p-6 text-ink/70"
    >
      No valid recipes found.
    </div>
  </div>
</template>
