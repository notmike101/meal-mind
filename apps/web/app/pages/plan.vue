<script setup lang="ts">
import { callOnce } from "#app";
import { computed } from "vue";
import { usePlanningStore } from "~/stores/planning";
import { useRecipesStore } from "~/stores/recipes";
import { isPlanLocked } from "~/utils/plans";

// eslint-disable-next-line no-undef
definePageMeta({ layout: "wide" });

const planning = usePlanningStore();
const recipes = useRecipesStore();
await Promise.all([
  callOnce("planning-state", () => planning.fetchState(), { mode: "navigation" }),
  callOnce("recipe-catalog", () => recipes.fetchCatalog(), { mode: "navigation" }),
]);
const plan = computed(() => planning.editablePlan);
const locked = computed(() => plan.value ? isPlanLocked(plan.value) : false);
const recipeOptions = computed(() => recipes.catalog?.recipes ?? []);
const pageTitle = computed(() => locked.value ? "Weekly meal plan" : "Choose next week's meals");
const pageDescription = computed(() => locked.value
  ? "Your committed lunch and dinner schedule."
  : "Select a meal slot, then choose from the recipe catalog.");
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <PageHeading eyebrow="Plan" :title="pageTitle" :description="pageDescription" />
      <div class="flex flex-wrap gap-2">
        <PlanGeneratePlanButton :replace-existing="planning.nextDraft?.status === 'draft'" />
        <PlanCommitPlanButton v-if="plan?.status === 'draft'" :plan-id="plan.id" />
      </div>
    </section>
    <div v-if="(recipes.catalog?.invalidRecipes.length ?? 0) > 0" class="rounded-md border border-tomato/30 bg-tomato/5 p-4 text-sm text-tomato">
      {{ recipes.catalog?.invalidRecipes.length }} invalid recipe file{{ recipes.catalog?.invalidRecipes.length === 1 ? "" : "s" }} excluded from planning.
    </div>
    <section v-if="plan" class="space-y-4">
      <PlanSummary :plan="plan" :locked="locked" />
      <PlanLockedWeek v-if="locked" :plan="plan" :recipes="recipeOptions" />
      <PlanSelectionWorkspace v-else :plan="plan" :recipes="recipeOptions" />
    </section>
    <section v-else class="rounded-md border border-dashed border-ink/20 bg-surface p-6">
      <h2 class="text-lg font-semibold">No plan yet</h2>
      <p v-if="planning.nextWeek" class="mt-2 text-ink/70">
        {{ planning.nextWeek.weekStart }} through {{ planning.nextWeek.weekEnd }}
      </p>
    </section>
  </div>
</template>
