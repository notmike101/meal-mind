<script setup lang="ts">
import { definePageMeta, navigateTo, useRoute } from "#imports";
import { CalendarDays, ChevronLeft, ChevronRight, ListChecks, RefreshCw, ShoppingBasket } from "@lucide/vue";
import { createError } from "h3";
import { computed, ref, watch } from "vue";
import { errorMessage } from "~/composables/use-api";
import { useRecipeModal } from "~/composables/use-recipe-modal";
import { usePlanningStore } from "~/stores/planning";
import { useRecipesStore } from "~/stores/recipes";
import { useSettingsStore } from "~/stores/settings";
import { useShoppingStore } from "~/stores/shopping";
import { addDays, formatDateInTimeZone, formatDisplayDate, normalizeWeekStart } from "~/utils/dates";
import { resolveWorkspaceView, selectDefaultWeek, workspaceLocation, type WorkspaceView } from "~/utils/plan-workspace";
import { isPlanLocked } from "~/utils/plans";

definePageMeta({ layout: "wide" });

const route = useRoute();
const planning = usePlanningStore();
const recipes = useRecipesStore();
const settings = useSettingsStore();
const shopping = useShoppingStore();
const recipeModal = useRecipeModal();
const shoppingBusy = ref(false);
const shoppingError = ref<string | null>(null);

await Promise.all([
  planning.fetchState(),
  planning.fetchPlanSummaries(),
  recipes.fetchCatalog(),
  settings.fetchSettings(),
]);
if (!planning.currentWeek) throw createError({ statusCode: 503, statusMessage: "Planning state is unavailable." });

const rawInitialWeek = Array.isArray(route.query.week) ? route.query.week[0] : route.query.week;
const requestedWeek = normalizeWeekStart(rawInitialWeek);
const initialWeek = requestedWeek ?? selectDefaultWeek(planning.currentWeek, planning.planSummaries);
const initialView = resolveWorkspaceView(Array.isArray(route.query.view) ? route.query.view[0] : route.query.view);
const selectedWeekStart = ref(initialWeek);
const selectedView = ref<WorkspaceView>(initialView);

if (rawInitialWeek !== initialWeek || route.query.view !== initialView) {
  await navigateTo(workspaceLocation(initialWeek, initialView), { replace: true });
}
await planning.fetchWeek(initialWeek);

const plan = computed(() => planning.selectedPlan);
const locked = computed(() => plan.value ? isPlanLocked(plan.value) : false);
const weekEnd = computed(() => addDays(selectedWeekStart.value, 6));
const currentWeekStart = computed(() => planning.currentWeek?.weekStart ?? selectedWeekStart.value);
const isCurrentWeek = computed(() => selectedWeekStart.value === currentWeekStart.value);
const isFutureWeek = computed(() => selectedWeekStart.value > currentWeekStart.value);
const canCreateBlankWeek = computed(() => !plan.value && selectedWeekStart.value >= currentWeekStart.value);
const canGenerateWeek = computed(() => !plan.value && isFutureWeek.value);
const canRegenerateWeek = computed(() => plan.value?.status === "draft" && isFutureWeek.value);
const recipeOptions = computed(() => recipes.catalog?.recipes ?? []);
const defaultServings = computed(() => settings.data?.settings.defaultMealServings ?? 1);
const defaultMealCount = computed(() => settings.data?.settings.defaultWeeklyMealCount ?? 14);
const timezone = computed(() => settings.data?.settings.timezone ?? "America/Chicago");
const today = computed(() => formatDateInTimeZone(new Date(), timezone.value));
const todayMeals = computed(() => {
  if (!plan.value || plan.value.skippedDates.includes(today.value)) return [];
  return plan.value.meals.filter((meal) => meal.date === today.value);
});
const showToday = computed(() => isCurrentWeek.value && plan.value?.status !== "draft" && Boolean(plan.value));
const weekTitle = computed(() => `${formatDisplayDate(selectedWeekStart.value)} – ${formatDisplayDate(weekEnd.value)}`);
const weekDescription = computed(() => {
  if (isCurrentWeek.value) return `This week · Planning in ${timezone.value}`;
  return selectedWeekStart.value < currentWeekStart.value ? "A saved week from your plan history." : "An upcoming planning week.";
});
const previousLocation = computed(() => workspaceLocation(addDays(selectedWeekStart.value, -7), selectedView.value));
const nextLocation = computed(() => workspaceLocation(addDays(selectedWeekStart.value, 7), selectedView.value));
const currentLocation = computed(() => workspaceLocation(currentWeekStart.value, selectedView.value));
const planLocation = computed(() => workspaceLocation(selectedWeekStart.value, "plan"));
const shoppingLocation = computed(() => workspaceLocation(selectedWeekStart.value, "shopping"));

function shoppingPlan() {
  return plan.value
    ? { id: plan.value.id, weekStart: plan.value.weekStart, weekEnd: plan.value.weekEnd, status: plan.value.status }
    : null;
}

async function syncShopping() {
  if (selectedView.value === "shopping") await shopping.fetchForPlan(shoppingPlan());
}

await syncShopping();

watch(
  () => [route.query.week, route.query.view] as const,
  async ([weekValue, viewValue]) => {
    const rawWeek = Array.isArray(weekValue) ? weekValue[0] : weekValue;
    const normalizedWeek = normalizeWeekStart(rawWeek);
    const view = resolveWorkspaceView(Array.isArray(viewValue) ? viewValue[0] : viewValue);
    if (!normalizedWeek) {
      await navigateTo(workspaceLocation(selectedWeekStart.value, view), { replace: true });
      return;
    }
    if (rawWeek !== normalizedWeek || viewValue !== view) {
      await navigateTo(workspaceLocation(normalizedWeek, view), { replace: true });
      return;
    }
    selectedView.value = view;
    if (selectedWeekStart.value !== normalizedWeek) {
      selectedWeekStart.value = normalizedWeek;
      await planning.fetchWeek(normalizedWeek);
    }
    await syncShopping();
  },
);

watch(() => plan.value?.id, async () => {
  await syncShopping();
});

function openRecipe(recipeId: string, servings: number, trigger: globalThis.HTMLElement) {
  void recipeModal.openRecipe(recipeId, servings, trigger);
}

async function generateShoppingList() {
  shoppingBusy.value = true;
  shoppingError.value = null;
  try {
    await shopping.generate();
  } catch (caught) {
    shoppingError.value = errorMessage(caught, "Could not generate this shopping list.");
  } finally {
    shoppingBusy.value = false;
  }
}
</script>

<template>
  <div
    class="mm-space-y-6"
    data-testid="weekly-workspace"
    :data-plan-id="plan?.id ?? ''"
    :data-week-start="selectedWeekStart"
  >
    <section class="flex flex-col mm-gap-6 xl:flex-row xl:items-end xl:justify-between">
      <PageHeading eyebrow="Weekly workspace" :title="weekTitle" :description="weekDescription" />
      <div class="flex flex-wrap items-center mm-gap-2" aria-label="Week navigation">
        <NuxtLink :to="previousLocation" aria-label="Previous week" class="focus-ring mm-button-secondary inline-flex min-h-11 items-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-semibold">
          <ChevronLeft :size="17" aria-hidden="true" /> Previous
        </NuxtLink>
        <NuxtLink :to="currentLocation" class="focus-ring mm-button-secondary inline-flex min-h-11 items-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-semibold">
          <CalendarDays :size="17" aria-hidden="true" /> This week
        </NuxtLink>
        <NuxtLink :to="nextLocation" aria-label="Next week" class="focus-ring mm-button-secondary inline-flex min-h-11 items-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-semibold">
          Next <ChevronRight :size="17" aria-hidden="true" />
        </NuxtLink>
      </div>
    </section>

    <nav class="flex border-b border-line/30" aria-label="Weekly workspace views">
      <NuxtLink
        :to="planLocation"
        data-testid="plan-tab"
        :aria-current="selectedView === 'plan' ? 'page' : undefined"
        :class="selectedView === 'plan' ? 'border-moss text-moss' : 'border-transparent text-ink/60 hover:text-ink'"
        class="focus-ring inline-flex min-h-11 items-center mm-gap-2 border-b-2 px-4 py-3 mm-text-sm font-bold"
      >
        <ListChecks :size="17" aria-hidden="true" /> Plan
      </NuxtLink>
      <NuxtLink
        :to="shoppingLocation"
        data-testid="shopping-tab"
        :aria-current="selectedView === 'shopping' ? 'page' : undefined"
        :class="selectedView === 'shopping' ? 'border-moss text-moss' : 'border-transparent text-ink/60 hover:text-ink'"
        class="focus-ring inline-flex min-h-11 items-center mm-gap-2 border-b-2 px-4 py-3 mm-text-sm font-bold"
      >
        <ShoppingBasket :size="17" aria-hidden="true" /> Shopping
      </NuxtLink>
    </nav>

    <div v-if="planning.selectionLoading" class="mm-panel py-16 text-center text-ink/60" role="status">Loading week…</div>
    <div v-else-if="planning.selectionError" class="rounded-xl bg-tomato/10 mm-p-4 mm-text-sm font-medium text-tomato" role="alert">
      {{ planning.selectionError }}
    </div>

    <template v-else-if="selectedView === 'plan'">
      <div v-if="(recipes.catalog?.invalidRecipes.length ?? 0) > 0" class="rounded-xl border border-tomato/25 bg-tomato/10 mm-p-4 mm-text-sm font-medium text-tomato">
        {{ recipes.catalog?.invalidRecipes.length }} invalid recipe file{{ recipes.catalog?.invalidRecipes.length === 1 ? "" : "s" }} excluded from planning.
      </div>

      <section v-if="!plan && (canGenerateWeek || canCreateBlankWeek)" class="flex flex-wrap mm-gap-2" aria-label="Create a plan">
        <PlanGeneratePlanButton v-if="canGenerateWeek" :week-start="selectedWeekStart" :default-meal-count="defaultMealCount" />
        <PlanBlankPlanButton v-if="canCreateBlankWeek" :week-start="selectedWeekStart" />
      </section>
      <section v-else-if="plan?.status === 'draft'" class="flex flex-wrap mm-gap-2" aria-label="Plan actions">
        <PlanCommitPlanButton :plan-id="plan.id" />
        <PlanGeneratePlanButton
          v-if="canRegenerateWeek"
          :week-start="selectedWeekStart"
          :default-meal-count="defaultMealCount"
          replace-existing
        />
      </section>

      <PlanTodayMeals v-if="showToday" :meals="todayMeals" @open-details="openRecipe" />

      <section v-if="plan" data-testid="plan-content" class="mm-space-y-6">
        <PlanSummary :plan="plan" :locked="locked" />
        <PlanLockedWeek v-if="locked" data-testid="plan-workspace" :plan="plan" :recipes="recipeOptions" @open-details="openRecipe" />
        <PlanSelectionWorkspace v-else data-testid="plan-workspace" :plan="plan" :recipes="recipeOptions" :default-servings="defaultServings" @open-details="openRecipe" />
      </section>
      <section v-else class="mm-panel border-dashed py-16 text-center">
        <h2 class="mm-display mm-text-2xl font-bold">No plan for this week</h2>
        <p v-if="canGenerateWeek" class="mm-mt-2 text-ink/70">Generate a plan or start with a blank week.</p>
        <p v-else-if="canCreateBlankWeek" class="mm-mt-2 text-ink/70">Start with a blank week to plan the current week manually.</p>
        <p v-else class="mm-mt-2 text-ink/70">Past empty weeks are kept read-only.</p>
      </section>
    </template>

    <template v-else>
      <div v-if="shopping.loading" class="mm-panel py-16 text-center text-ink/60" role="status">Loading shopping list…</div>
      <div v-else-if="shopping.error" class="rounded-xl bg-tomato/10 mm-p-4 mm-text-sm font-medium text-tomato" role="alert">{{ shopping.error }}</div>
      <ShoppingList
        v-else-if="plan && shopping.shoppingList"
        :items="shopping.shoppingList.items"
        :can-regenerate="!locked"
      />
      <section v-else-if="plan" class="mm-panel border-dashed py-16 text-center">
        <ShoppingBasket :size="28" class="mx-auto text-moss" aria-hidden="true" />
        <h2 class="mm-mt-3 mm-display mm-text-2xl font-bold">No shopping list yet</h2>
        <p class="mx-auto mm-mt-2 max-w-lg text-ink/70">
          {{ plan.meals.length ? "Generate the grocery list for this exact weekly plan." : "Add meals to this plan before generating its grocery list." }}
        </p>
        <button
          v-if="plan.meals.length"
          type="button"
          :disabled="shoppingBusy"
          class="focus-ring mm-button-primary mm-mt-5 inline-flex min-h-11 items-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-bold"
          @click="generateShoppingList"
        >
          <RefreshCw :size="16" :class="shoppingBusy ? 'animate-spin' : ''" aria-hidden="true" />
          {{ shoppingBusy ? "Generating" : "Generate list" }}
        </button>
        <p v-if="shoppingError" role="alert" class="mx-auto mm-mt-3 max-w-lg mm-text-sm text-tomato">{{ shoppingError }}</p>
      </section>
      <section v-else class="mm-panel border-dashed py-16 text-center">
        <h2 class="mm-display mm-text-2xl font-bold">No plan for this week</h2>
        <p class="mm-mt-2 text-ink/70">Create the week in the Plan tab before building a shopping list.</p>
        <NuxtLink :to="planLocation" class="focus-ring mm-button-secondary mm-mt-5 inline-flex min-h-11 items-center mm-px-4 mm-py-2 mm-text-sm font-bold">Open Plan</NuxtLink>
      </section>
    </template>
  </div>
</template>
