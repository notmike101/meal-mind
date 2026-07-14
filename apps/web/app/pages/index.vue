<script setup lang="ts">
import { callOnce } from "#app";
import { CalendarClock } from "@lucide/vue";
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
  <div class="mm-space-y-6">
    <PageHeading eyebrow="Dashboard" title="Today's plan" :description="`${formatDisplayDate(today)} · Planning in ${timezone}`" />
    <DashboardDailyReminder v-if="planning.activePlan" :meals="todayMeals" @open-details="openRecipe" />
    <section v-else class="rounded-md bg-surface mm-p-5 shadow-line">
      <div class="flex items-center mm-gap-2 text-ink">
        <CalendarClock :size="20" aria-hidden="true" />
        <h2 class="mm-text-xl font-semibold">No active plan today</h2>
      </div>
      <p class="mm-mt-2 text-ink/70">No committed meals are scheduled for today.</p>
    </section>
    <DashboardThisWeekPreview
      v-if="planning.activePlan && today < planning.activePlan.weekEnd"
      :plan="planning.activePlan"
      :today="today"
      @open-details="openRecipe"
    />
  </div>
</template>
