<script setup lang="ts">
import { callOnce } from "#app";
import { BookOpen, Search } from "@lucide/vue";
import { computed, ref } from "vue";
import { useRecipeModal } from "~/composables/use-recipe-modal";
import { useRecipesStore } from "~/stores/recipes";

const recipes = useRecipesStore();
const recipeModal = useRecipeModal();
await callOnce("recipe-catalog", () => recipes.fetchCatalog(), { mode: "navigation" });
const query = ref("");
const filteredRecipes = computed(() => {
  const normalized = query.value.trim().toLocaleLowerCase();
  const catalog = recipes.catalog?.recipes ?? [];
  if (!normalized) return catalog;
  return catalog.filter((recipe) => [recipe.title, recipe.description, ...recipe.tags]
    .filter(Boolean)
    .some((value) => String(value).toLocaleLowerCase().includes(normalized)));
});

function openRecipe(recipeId: string, trigger: globalThis.HTMLElement) {
  void recipeModal.openRecipe(recipeId, 2, trigger);
}
</script>

<template>
  <div class="mm-space-y-6">
    <section class="mm-panel flex flex-col mm-gap-6 mm-p-6 lg:flex-row lg:items-end lg:justify-between sm:p-8">
      <PageHeading eyebrow="Recipes" title="CookLang recipe library" description="Browse your trusted local collection and find the right meal in seconds." />
      <div class="flex items-center mm-gap-3 rounded-2xl border border-moss/15 bg-moss/10 mm-px-4 mm-py-3 text-moss">
        <BookOpen :size="20" aria-hidden="true" />
        <span class="mm-text-sm font-bold">{{ recipes.catalog?.recipes.length ?? 0 }} recipes</span>
      </div>
    </section>
    <RecipesInvalidRecipeNotice
      v-if="recipes.catalog?.invalidRecipes.length"
      :invalid-recipes="recipes.catalog.invalidRecipes"
    />
    <section class="mm-panel mm-p-4 sm:p-5" aria-label="Recipe filters">
      <label class="relative block">
        <span class="sr-only">Search recipes</span>
        <Search class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/45" :size="19" aria-hidden="true" />
        <input
          v-model="query"
          type="search"
          class="focus-ring mm-field w-full py-3 pl-12 pr-4 text-ink"
          placeholder="Search by recipe name, description, or tag…"
        />
      </label>
      <p class="mm-mt-3 mm-text-sm text-ink/55" aria-live="polite">
        Showing {{ filteredRecipes.length }} of {{ recipes.catalog?.recipes.length ?? 0 }} recipes
      </p>
    </section>
    <section class="grid mm-gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <RecipesRecipeCard
        v-for="recipe in filteredRecipes"
        :key="recipe.id"
        :recipe="recipe"
        @open-details="openRecipe"
      />
    </section>
    <div
      v-if="filteredRecipes.length === 0"
      class="mm-panel border-dashed mm-p-8 text-center text-ink/60"
    >
      {{ query ? "No recipes match your search." : "No valid recipes found." }}
    </div>
  </div>
</template>
