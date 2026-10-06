<script setup lang="ts">
import { callOnce } from "#app";
import { Search } from "@lucide/vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
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
const importSubmitting = ref(false);
const importOpen = ref(false);
const importDisclosure = ref<globalThis.HTMLDetailsElement | null>(null);
let importPollTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

const terminalStatuses = new Set(["succeeded", "failed"]);
const importBusy = computed(() => importSubmitting.value || Boolean(importJob.value && !terminalStatuses.has(importJob.value.status)));
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
  importOpen.value = true;
  importSubmitting.value = true;
  importRequestError.value = null;
  try {
    importJob.value = await recipes.startRecipeImport(url);
    await recipes.fetchRecentImports();
    scheduleImportPoll();
  } catch (error) {
    importRequestError.value = errorMessage(error, "Recipe import could not be started.");
  } finally {
    importSubmitting.value = false;
  }
}

function viewImportedRecipe(event: globalThis.MouseEvent, recipeId: string) {
  const trigger = event.currentTarget instanceof globalThis.HTMLElement ? event.currentTarget : undefined;
  void recipeModal.openRecipe(recipeId, 2, trigger);
}

function toggleImport(event: globalThis.Event) {
  const disclosure = event.currentTarget as globalThis.HTMLDetailsElement;
  if (importBusy.value && !disclosure.open) disclosure.open = true;
  importOpen.value = disclosure.open;
}

async function revealImport() {
  importOpen.value = true;
  await nextTick();
  importDisclosure.value?.scrollIntoView({ block: "nearest" });
  importDisclosure.value?.querySelector("summary")?.focus();
}

onMounted(() => {
  const active = recipes.imports.find((job) => !terminalStatuses.has(job.status));
  if (active) {
    importJob.value = active;
    importOpen.value = true;
    scheduleImportPoll();
  }
});

onBeforeUnmount(stopImportPolling);
</script>

<template>
  <div class="mm-space-y-6">
    <header class="mm-space-y-3">
      <h1 class="mm-page-title">CookLang recipe library</h1>
      <p class="mm-text-sm text-steel">{{ recipes.catalog?.recipes.length ?? 0 }} recipes ready to cook</p>
    </header>
    <section class="mm-library-toolbar" aria-label="Recipe collection controls">
      <div class="min-w-0">
        <label class="relative block">
          <span class="sr-only">Search recipes</span>
          <Search class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" :size="19" aria-hidden="true" />
          <input v-model="query" type="search" class="focus-ring mm-field w-full py-3 pl-11 pr-4 mm-text-base text-ink" placeholder="Search by recipe name, description, or tag…" />
        </label>
        <p class="mm-mt-2 mm-text-sm text-steel" aria-live="polite">Showing {{ filteredRecipes.length }} of {{ recipes.catalog?.recipes.length ?? 0 }} recipes</p>
      </div>
      <button type="button" aria-controls="recipe-import-disclosure" :aria-expanded="importOpen" class="focus-ring mm-button-secondary inline-flex min-h-control items-center justify-center mm-px-4 mm-py-3 mm-text-sm font-semibold" @click="revealImport">Import recipe</button>
    </section>
    <RecipesInvalidRecipeNotice v-if="recipes.catalog?.invalidRecipes.length" :invalid-recipes="recipes.catalog.invalidRecipes" />
    <div class="mm-library-workspace" :class="{ 'mm-library-workspace-open': importOpen }">
      <div class="min-w-0">
        <section class="mm-library-results grid mm-gap-4 sm:grid-cols-2" aria-label="Recipe results">
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
      <details id="recipe-import-disclosure" ref="importDisclosure" class="mm-import-disclosure" :open="importOpen" @toggle="toggleImport">
        <summary class="focus-ring mm-button-secondary min-h-control mm-px-4 mm-py-3 mm-text-sm font-semibold" @click="importBusy && $event.preventDefault()">Import recipe</summary>
        <RecipesImportRecipeForm
          :busy="importBusy"
          :job="importJob"
          :recent-jobs="recipes.imports"
          :request-error="importRequestError"
          @submit="startImport"
          @view-recipe="viewImportedRecipe"
        />
      </details>
    </div>
  </div>
</template>
