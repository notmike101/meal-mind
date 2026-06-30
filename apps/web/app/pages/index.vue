<script setup lang="ts">
import { callOnce } from "#app";
import { CalendarClock } from "@lucide/vue";
import { computed } from "vue";
import { usePlanningStore } from "~/stores/planning";
import { useSettingsStore } from "~/stores/settings";
import { formatDisplayDate, formatDateInTimeZone } from "~/utils/dates";

const planning = usePlanningStore();
const settings = useSettingsStore();
await Promise.all([
  callOnce("planning-state", () => planning.fetchState(), { mode: "navigation" }),
  callOnce("settings-data", () => settings.fetchSettings(), { mode: "navigation" }),
]);

const timezone = computed(() => settings.data?.settings.timezone ?? "America/Chicago");
const today = computed(() => formatDateInTimeZone(new Date(), timezone.value));
const todayMeals = computed(() => planning.activePlan?.meals.filter((meal) => meal.date === today.value) ?? []);
</script>

<template>
  <div class="space-y-6">
    <PageHeading eyebrow="Dashboard" title="Today's plan" :description="`${formatDisplayDate(today)} · Planning in ${timezone}`" />
    <DashboardDailyReminder v-if="planning.activePlan" :meals="todayMeals" />
    <section v-else class="rounded-md bg-surface p-5 shadow-line">
      <div class="flex items-center gap-2 text-ink">
        <CalendarClock :size="20" aria-hidden="true" />
        <h2 class="text-xl font-semibold">No active plan today</h2>
      </div>
      <p class="mt-2 text-ink/70">No committed meals are scheduled for today.</p>
    </section>
    <section v-if="planning.nextWeek" class="grid gap-4 md:grid-cols-2">
      <DashboardNextWeekCard
        :week="planning.nextWeek"
        :replace-existing="planning.nextDraft?.status === 'draft'"
        :default-meal-count="settings.data?.settings.defaultWeeklyMealCount ?? 14"
      />
      <DashboardDraftStatusCard :draft="planning.nextDraft" />
    </section>
  </div>
</template>
