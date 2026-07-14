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
    <section class="flex flex-col mm-gap-6 lg:flex-row lg:items-end lg:justify-between">
      <PageHeading eyebrow="Recipes" title="CookLang recipe library" description="Browse your trusted local collection and find the right meal in seconds." />
      <div class="flex w-fit shrink-0 items-center mm-gap-3 rounded-2xl border border-line/25 bg-surface px-4 py-3 shadow-sm">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-moss/12 text-moss">
          <BookOpen :size="20" aria-hidden="true" />
        </span>
        <div>
          <span class="block text-2xl font-bold leading-none tabular-nums">{{ recipes.catalog?.recipes.length ?? 0 }}</span>
          <span class="mt-1 block mm-text-xs font-semibold text-ink/65">recipes ready to cook</span>
        </div>
      </div>
    </section>
    <RecipesInvalidRecipeNotice
      v-if="recipes.catalog?.invalidRecipes.length"
      :invalid-recipes="recipes.catalog.invalidRecipes"
    />
    <section class="mm-panel mm-p-4 sm:p-5" aria-label="Recipe filters">
      <label class="relative block">
        <span class="sr-only">Search recipes</span>
        <Search class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/50" :size="19" aria-hidden="true" />
        <input
          v-model="query"
          type="search"
          class="focus-ring mm-field w-full py-3 pl-11 pr-4 mm-text-base text-ink"
          placeholder="Search by recipe name, description, or tag…"
        />
      </label>
      <p class="mm-mt-3 mm-text-sm font-medium text-ink/65" aria-live="polite">
        Showing {{ filteredRecipes.length }} of {{ recipes.catalog?.recipes.length ?? 0 }} recipes
      </p>
    </section>
    <section class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <RecipesRecipeCard
        v-for="recipe in filteredRecipes"
        :key="recipe.id"
        :recipe="recipe"
        @open-details="openRecipe"
      />
    </section>
    <div
      v-if="filteredRecipes.length === 0"
      class="mm-panel border-dashed py-16 text-center text-ink/65"
    >
      {{ query ? "No recipes match your search." : "No valid recipes found." }}
    </div>
  </div>
</template>
