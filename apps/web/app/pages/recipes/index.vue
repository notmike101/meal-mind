<script setup lang="ts">
import { callOnce } from "#app";
import { Search } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { RecipeImportJobDto } from "@mealmind/contracts";
import { errorMessage } from "~/composables/use-api";
import { useRecipeModal } from "~/composables/use-recipe-modal";
import { useRecipesStore } from "~/stores/recipes";

const recipes = useRecipesStore();
const recipeModal = useRecipeModal();
await callOnce("recipe-library", () => Promise.all([recipes.fetchCatalog(), recipes.fetchRecentImports()]), { mode: "navigation" });
const query = ref("");
const importJob = ref<RecipeImportJobDto | null>(null);
const importRequestError = ref<string | null>(null);
let importPollTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

const terminalStatuses = new Set(["succeeded", "failed"]);
const importBusy = computed(() => Boolean(importJob.value && !terminalStatuses.has(importJob.value.status)));
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

function stopImportPolling() {
  if (importPollTimer) globalThis.clearTimeout(importPollTimer);
  importPollTimer = null;
}

function scheduleImportPoll() {
  stopImportPolling();
  if (!importJob.value || terminalStatuses.has(importJob.value.status)) return;
  importPollTimer = globalThis.setTimeout(() => void pollImport(), 900);
}

async function pollImport() {
  if (!importJob.value || terminalStatuses.has(importJob.value.status)) return;
  try {
    importJob.value = await recipes.fetchRecipeImport(importJob.value.id);
    await recipes.fetchRecentImports();
    if (importJob.value.status === "succeeded") await recipes.fetchCatalog();
    scheduleImportPoll();
  } catch (error) {
    importRequestError.value = errorMessage(error, "Import status could not be loaded.");
    scheduleImportPoll();
  }
}

async function startImport(url: string) {
  importRequestError.value = null;
  try {
    importJob.value = await recipes.startRecipeImport(url);
    await recipes.fetchRecentImports();
    scheduleImportPoll();
  } catch (error) {
    importRequestError.value = errorMessage(error, "Recipe import could not be started.");
  }
}

function viewImportedRecipe(event: globalThis.MouseEvent, recipeId: string) {
  const trigger = event.currentTarget instanceof globalThis.HTMLElement ? event.currentTarget : undefined;
  void recipeModal.openRecipe(recipeId, 2, trigger);
}

onMounted(() => {
  const active = recipes.imports.find((job) => !terminalStatuses.has(job.status));
  if (active) {
    importJob.value = active;
    scheduleImportPoll();
  }
});

onBeforeUnmount(stopImportPolling);
</script>

<template>
  <div class="mm-space-y-6">
    <section class="mm-space-y-3">
      <PageHeading eyebrow="Recipes" title="CookLang recipe library" description="Browse your trusted local collection and find the right meal in seconds." />
      <p class="mm-text-sm text-steel">{{ recipes.catalog?.recipes.length ?? 0 }} recipes ready to cook</p>
    </section>
    <RecipesImportRecipeForm
      :busy="importBusy"
      :job="importJob"
      :recent-jobs="recipes.imports"
      :request-error="importRequestError"
      @submit="startImport"
      @view-recipe="viewImportedRecipe"
    />
    <RecipesInvalidRecipeNotice
      v-if="recipes.catalog?.invalidRecipes.length"
      :invalid-recipes="recipes.catalog.invalidRecipes"
    />
    <section class="mm-panel mm-p-4 sm:p-5" aria-label="Recipe filters">
      <label class="relative block">
        <span class="sr-only">Search recipes</span>
        <Search class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" :size="19" aria-hidden="true" />
        <input
          v-model="query"
          type="search"
          class="focus-ring mm-field w-full py-3 pl-11 pr-4 mm-text-base text-ink"
          placeholder="Search by recipe name, description, or tag…"
        />
      </label>
      <p class="mm-mt-3 mm-text-sm font-medium text-steel" aria-live="polite">
        Showing {{ filteredRecipes.length }} of {{ recipes.catalog?.recipes.length ?? 0 }} recipes
      </p>
    </section>
    <section class="grid mm-gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <RecipesRecipeCard
        v-for="recipe in filteredRecipes"
        :key="recipe.id"
        :recipe="recipe"
        @open-details="openRecipe"
      />
    </section>
    <div
      v-if="filteredRecipes.length === 0"
      class="mm-panel border-dashed mm-p-8 text-center text-steel"
    >
      {{ query ? "No recipes match your search." : "No valid recipes found." }}
    </div>
  </div>
</template>
