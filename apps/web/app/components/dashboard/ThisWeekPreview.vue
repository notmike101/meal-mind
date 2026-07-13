<script setup lang="ts">
import type { MealDto, MealPlanDto } from "@mealmind/contracts";
import { ArrowRight } from "@lucide/vue";
import { computed } from "vue";
import { formatDisplayDate, getDatesInWeek } from "~/utils/dates";

const props = defineProps<{
  plan: MealPlanDto;
  today: string;
}>();

const dates = computed(() => getDatesInWeek(props.plan.weekStart)
  .filter((date) => date > props.today && !props.plan.skippedDates.includes(date)));
const remainingMeals = computed(() => props.plan.meals
  .filter((meal) => dates.value.includes(meal.date)));
const dateRange = computed(() => {
  const firstDate = dates.value[0];
  const lastDate = dates.value[dates.value.length - 1];
  return firstDate && lastDate
    ? `${formatDisplayDate(firstDate)} through ${formatDisplayDate(lastDate)}`
    : "";
});

function mealsForDate(date: string): MealDto[] {
  return remainingMeals.value.filter((meal) => meal.date === date);
}
</script>

<template>
  <section class="overflow-hidden rounded-md bg-surface shadow-line" aria-labelledby="dashboard-this-week-heading">
    <div class="flex flex-col mm-gap-3 mm-p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="mm-text-sm font-medium uppercase tracking-wide text-moss">This week</p>
        <h2 id="dashboard-this-week-heading" class="mm-mt-1 mm-text-xl font-semibold">
          {{ dateRange }}
        </h2>
        <p class="mm-mt-1 mm-text-sm text-ink/65">
          {{ remainingMeals.length }} meal{{ remainingMeals.length === 1 ? "" : "s" }} across
          {{ dates.length }} remaining day{{ dates.length === 1 ? "" : "s" }}
        </p>
      </div>
      <NuxtLink
        to="/plan"
        class="focus-ring inline-flex min-h-10 items-center justify-center mm-gap-2 rounded-md border border-ink/15 mm-px-4 mm-py-2 mm-text-sm font-semibold hover:bg-field"
      >
        View full plan <ArrowRight :size="16" aria-hidden="true" />
      </NuxtLink>
    </div>

    <div class="border-t border-ink/10">
      <article
        v-for="date in dates"
        :key="date"
        class="grid mm-gap-3 border-b border-ink/10 mm-p-4 last:border-b-0 sm:grid-cols-[8rem_minmax(0,1fr)]"
      >
        <h3 class="font-semibold">{{ formatDisplayDate(date) }}</h3>
        <div v-if="mealsForDate(date).length" class="grid grid-cols-2 mm-gap-3">
          <div v-for="meal in mealsForDate(date)" :key="meal.id" class="min-w-0">
            <p class="mm-text-xs font-semibold uppercase tracking-wide text-moss">{{ meal.slot || "Meal" }}</p>
            <p class="mm-mt-1 line-clamp-2 mm-text-sm font-medium leading-snug">{{ meal.recipeTitleSnapshot }}</p>
          </div>
        </div>
        <p v-else class="mm-text-sm text-ink/60">No meals planned.</p>
      </article>
    </div>
  </section>
</template>
