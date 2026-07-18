<script setup lang="ts">
import type { MealDto, MealPlanDto } from "@mealmind/contracts";
import { CalendarDays } from "@lucide/vue";
import { computed } from "vue";
import { formatDisplayDate, getDatesInWeek } from "~/utils/dates";

const props = defineProps<{
  plan: MealPlanDto;
  today: string;
}>();
const emit = defineEmits<{ openDetails: [recipeId: string, servings: number, trigger: globalThis.HTMLElement] }>();

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

function openRecipe(event: globalThis.MouseEvent, meal: MealDto) {
  emit("openDetails", meal.recipeId, meal.servings, event.currentTarget as globalThis.HTMLElement);
}
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-line/25 bg-surface shadow-sm" aria-labelledby="dashboard-this-week-heading">
    <div class="flex flex-col gap-5 border-b border-line/20 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div class="flex items-center gap-4">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-field text-moss">
          <CalendarDays :size="20" aria-hidden="true" />
        </span>
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-moss">Coming up</p>
          <h2 id="dashboard-this-week-heading" class="mt-1 text-xl font-semibold tracking-tight text-ink">
            {{ dateRange || "The rest of this week" }}
          </h2>
          <p class="mt-1 text-sm text-ink/60">
            {{ remainingMeals.length }} meal{{ remainingMeals.length === 1 ? "" : "s" }} across
            {{ dates.length }} remaining day{{ dates.length === 1 ? "" : "s" }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="dates.length" class="divide-y divide-line/20">
      <article
        v-for="date in dates"
        :key="date"
        class="grid gap-4 p-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6 sm:p-6"
      >
        <h3 class="text-base font-semibold text-ink">{{ formatDisplayDate(date) }}</h3>
        <div v-if="mealsForDate(date).length" class="grid gap-4 md:grid-cols-2">
          <div v-for="meal in mealsForDate(date)" :key="meal.id" class="min-w-0 rounded-xl bg-field/50 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.13em] text-moss">{{ meal.slot || "Meal" }}</p>
            <a
              :href="`/recipes/${encodeURIComponent(meal.recipeId)}`"
              class="focus-ring mt-1.5 inline-block rounded-md line-clamp-2 font-semibold leading-snug text-ink decoration-moss/50 underline-offset-4 hover:underline"
              @click.exact.left.prevent="openRecipe($event, meal)"
            >{{ meal.recipeTitleSnapshot }}</a>
            <p class="mt-1.5 text-xs text-ink/50">{{ meal.servings }} serving{{ meal.servings === 1 ? "" : "s" }}</p>
          </div>
        </div>
        <p v-else class="text-sm text-ink/55">No meals planned.</p>
      </article>
    </div>
    <div v-else class="flex items-center gap-3 p-6 text-sm text-ink/60 sm:p-8">
      <CalendarDays :size="20" class="shrink-0 text-moss" aria-hidden="true" />
      <p>No more meals are scheduled this week.</p>
    </div>
  </section>
</template>
