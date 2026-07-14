<script setup lang="ts">
import { callOnce } from "#app";
import { computed } from "vue";
import { usePlanningStore } from "~/stores/planning";
import { useRecipesStore } from "~/stores/recipes";
import { useSettingsStore } from "~/stores/settings";
import { useRecipeModal } from "~/composables/use-recipe-modal";
import { isPlanLocked } from "~/utils/plans";

// eslint-disable-next-line no-undef
definePageMeta({ layout: "wide" });

const planning = usePlanningStore();
const recipes = useRecipesStore();
const settings = useSettingsStore();
const recipeModal = useRecipeModal();
await Promise.all([
  callOnce("planning-state", () => planning.fetchState(), { mode: "navigation" }),
  callOnce("recipe-catalog", () => recipes.fetchCatalog(), { mode: "navigation" }),
  callOnce("settings-data", () => settings.fetchSettings(), { mode: "navigation" }),
]);
const plan = computed(() => planning.editablePlan);
const locked = computed(() => plan.value ? isPlanLocked(plan.value) : false);
const recipeOptions = computed(() => recipes.catalog?.recipes ?? []);
const pageTitle = computed(() => locked.value ? "Weekly meal plan" : "Choose next week's meals");
const pageDescription = computed(() => locked.value
  ? "Your committed weekly meal schedule."
  : "Add as many meals as you need, with optional meal slot labels.");
const defaultServings = computed(() => settings.data?.settings.defaultMealServings ?? 1);
const defaultMealCount = computed(() => settings.data?.settings.defaultWeeklyMealCount ?? 14);

function openRecipe(recipeId: string, servings: number, trigger: globalThis.HTMLElement) {
  void recipeModal.openRecipe(recipeId, servings, trigger);
}
</script>

<template>
  <div class="mm-space-y-6">
    <section class="mm-panel flex flex-col mm-gap-6 mm-p-6 lg:flex-row lg:items-end lg:justify-between sm:p-8">
      <PageHeading eyebrow="Plan" :title="pageTitle" :description="pageDescription" />
      <div class="flex flex-wrap mm-gap-2">
        <PlanGeneratePlanButton :replace-existing="planning.nextDraft?.status === 'draft'" :default-meal-count="defaultMealCount" />
        <PlanBlankPlanButton v-if="!planning.nextDraft" />
        <PlanCommitPlanButton v-if="plan?.status === 'draft'" :plan-id="plan.id" />
      </div>
    </section>
    <div v-if="(recipes.catalog?.invalidRecipes.length ?? 0) > 0" class="rounded-2xl border border-tomato/25 bg-tomato/10 mm-p-4 mm-text-sm font-medium text-tomato">
      {{ recipes.catalog?.invalidRecipes.length }} invalid recipe file{{ recipes.catalog?.invalidRecipes.length === 1 ? "" : "s" }} excluded from planning.
    </div>
    <section v-if="plan" data-testid="plan-content" class="mm-space-y-6">
      <PlanSummary :plan="plan" :locked="locked" />
      <PlanLockedWeek v-if="locked" data-testid="plan-workspace" :plan="plan" :recipes="recipeOptions" @open-details="openRecipe" />
      <PlanSelectionWorkspace v-else data-testid="plan-workspace" :plan="plan" :recipes="recipeOptions" :default-servings="defaultServings" @open-details="openRecipe" />
    </section>
    <section v-else class="mm-panel border-dashed mm-p-8 text-center">
      <h2 class="mm-text-xl font-bold">No plan yet</h2>
      <p v-if="planning.nextWeek" class="mm-mt-2 text-ink/70">
        {{ planning.nextWeek.weekStart }} through {{ planning.nextWeek.weekEnd }}
      </p>
    </section>
  </div>
</template>
