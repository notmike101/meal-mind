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
    <section class="flex flex-col mm-gap-8 border-b-2 border-ink pb-10 lg:flex-row lg:items-end lg:justify-between">
      <PageHeading eyebrow="Recipes" title="CookLang recipe library" description="Browse your trusted local collection and find the right meal in seconds." />
      <div class="flex shrink-0 items-end mm-gap-3 border-l border-ink pl-5">
        <BookOpen class="mb-2 text-moss" :size="22" aria-hidden="true" />
        <span class="mm-display text-6xl font-semibold leading-none">{{ recipes.catalog?.recipes.length ?? 0 }}</span>
        <span class="mb-1 mm-text-xs font-bold uppercase tracking-[0.18em] text-ink/50">Local<br>recipes</span>
      </div>
    </section>
    <RecipesInvalidRecipeNotice
      v-if="recipes.catalog?.invalidRecipes.length"
      :invalid-recipes="recipes.catalog.invalidRecipes"
    />
    <section class="border-y border-line/35 bg-surface mm-p-4 sm:p-5" aria-label="Recipe filters">
      <label class="relative block">
        <span class="sr-only">Search recipes</span>
        <Search class="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-ink/45" :size="19" aria-hidden="true" />
        <input
          v-model="query"
          type="search"
          class="focus-ring w-full border-0 border-b border-line/40 bg-transparent py-3 pl-9 pr-4 mm-text-lg text-ink outline-none transition-colors focus:border-moss"
          placeholder="Search by recipe name, description, or tag…"
        />
      </label>
      <p class="mm-mt-3 mm-text-sm text-ink/55" aria-live="polite">
        Showing {{ filteredRecipes.length }} of {{ recipes.catalog?.recipes.length ?? 0 }} recipes
      </p>
    </section>
    <section class="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      <RecipesRecipeCard
        v-for="recipe in filteredRecipes"
        :key="recipe.id"
        :recipe="recipe"
        @open-details="openRecipe"
      />
    </section>
    <div
      v-if="filteredRecipes.length === 0"
      class="border-y border-dashed border-line/40 py-16 text-center text-ink/60"
    >
      {{ query ? "No recipes match your search." : "No valid recipes found." }}
    </div>
  </div>
</template>
