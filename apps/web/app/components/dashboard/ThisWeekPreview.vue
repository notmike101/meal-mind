<script setup lang="ts">
import type { MealDto, MealPlanDto } from "@mealmind/contracts";
import { ArrowRight, CalendarDays } from "@lucide/vue";
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
  <section class="mm-panel overflow-hidden" aria-labelledby="dashboard-this-week-heading">
    <div class="flex flex-col mm-gap-4 border-b border-line/10 mm-p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div class="flex items-center mm-gap-3">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-steel/10 text-steel">
          <CalendarDays :size="21" aria-hidden="true" />
        </span>
        <div>
          <p class="mm-text-xs font-bold uppercase tracking-[0.14em] text-moss">This week</p>
          <h2 id="dashboard-this-week-heading" class="mm-mt-1 mm-text-xl font-bold">
            {{ dateRange }}
          </h2>
          <p class="mm-mt-1 mm-text-sm text-ink/60">
            {{ remainingMeals.length }} meal{{ remainingMeals.length === 1 ? "" : "s" }} across
            {{ dates.length }} remaining day{{ dates.length === 1 ? "" : "s" }}
          </p>
        </div>
      </div>
      <NuxtLink
        to="/plan"
        class="focus-ring mm-button-secondary inline-flex items-center justify-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-bold"
      >
        View full plan <ArrowRight :size="16" aria-hidden="true" />
      </NuxtLink>
    </div>

    <div class="grid mm-gap-4 mm-p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
      <article
        v-for="date in dates"
        :key="date"
        class="mm-card mm-interactive mm-p-4"
      >
        <h3 class="border-b border-line/10 mm-pb-2 font-bold">{{ formatDisplayDate(date) }}</h3>
        <div v-if="mealsForDate(date).length" class="mm-mt-3 mm-space-y-4">
          <div v-for="meal in mealsForDate(date)" :key="meal.id" class="min-w-0">
            <p class="mm-text-xs font-bold uppercase tracking-[0.12em] text-moss">{{ meal.slot || "Meal" }}</p>
            <a
              :href="`/recipes/${encodeURIComponent(meal.recipeId)}`"
              class="focus-ring mm-mt-1 inline-block rounded-sm line-clamp-2 mm-text-sm font-semibold leading-snug text-ink decoration-moss/50 underline-offset-4 hover:text-moss hover:underline"
              @click.exact.left.prevent="openRecipe($event, meal)"
            >{{ meal.recipeTitleSnapshot }}</a>
            <p class="mm-mt-1 mm-text-xs text-ink/50">{{ meal.servings }} serving{{ meal.servings === 1 ? "" : "s" }}</p>
          </div>
        </div>
        <p v-else class="mm-mt-3 mm-text-sm text-ink/55">No meals planned.</p>
      </article>
    </div>
  </section>
</template>
