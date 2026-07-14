<script setup lang="ts">
import { callOnce } from "#app";
import { ArrowRight, CalendarClock, ShoppingBasket } from "@lucide/vue";
import { computed } from "vue";
import { usePlanningStore } from "~/stores/planning";
import { useSettingsStore } from "~/stores/settings";
import { useRecipeModal } from "~/composables/use-recipe-modal";
import { formatDisplayDate, formatDateInTimeZone } from "~/utils/dates";

const planning = usePlanningStore();
const settings = useSettingsStore();
const recipeModal = useRecipeModal();
await Promise.all([
  callOnce("planning-state", () => planning.fetchState(), { mode: "navigation" }),
  callOnce("settings-data", () => settings.fetchSettings(), { mode: "navigation" }),
]);

const timezone = computed(() => settings.data?.settings.timezone ?? "America/Chicago");
const today = computed(() => formatDateInTimeZone(new Date(), timezone.value));
const todayMeals = computed(() => planning.activePlan?.skippedDates.includes(today.value)
  ? []
  : planning.activePlan?.meals.filter((meal) => meal.date === today.value) ?? []);

function openRecipe(recipeId: string, servings: number, trigger: globalThis.HTMLElement) {
  void recipeModal.openRecipe(recipeId, servings, trigger);
}
</script>

<template>
  <div class="space-y-8">
    <section class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
      <PageHeading eyebrow="Dashboard" title="Today's plan" :description="`${formatDisplayDate(today)} · Planning in ${timezone}`" />
      <div class="flex shrink-0 flex-wrap gap-3">
        <NuxtLink to="/plan" class="focus-ring mm-button-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold">
          Open weekly plan <ArrowRight :size="16" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink to="/shopping" class="focus-ring mm-button-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold">
          <ShoppingBasket :size="16" aria-hidden="true" /> Shopping list
        </NuxtLink>
      </div>
    </section>
    <DashboardDailyReminder v-if="planning.activePlan" :meals="todayMeals" @open-details="openRecipe" />
    <section v-else class="rounded-2xl border border-line/25 bg-surface p-6 shadow-sm sm:p-8">
      <div class="flex items-start gap-4">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-field text-moss">
          <CalendarClock :size="21" aria-hidden="true" />
        </span>
        <div>
          <h2 class="text-lg font-semibold text-ink">No active plan today</h2>
          <p class="mt-1 text-sm leading-6 text-ink/60">Commit a weekly plan to see today's meals and stay on track.</p>
          <NuxtLink to="/plan" class="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-moss hover:underline">
            Build a plan <ArrowRight :size="15" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
    </section>
    <DashboardThisWeekPreview
      v-if="planning.activePlan && today < planning.activePlan.weekEnd"
      :plan="planning.activePlan"
      :today="today"
      @open-details="openRecipe"
    />
  </div>
</template>
