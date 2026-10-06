<script setup lang="ts">
import type { MealDto, MealPlanDto, RecipeSummaryDto } from "@mealmind/contracts";
import { Clock, Users } from "@lucide/vue";
import { computed } from "vue";
import { formatDisplayDate, getDatesInWeek } from "~/utils/dates";

const props = defineProps<{ plan: MealPlanDto; recipes: RecipeSummaryDto[] }>();
const emit = defineEmits<{ openDetails: [recipeId: string, servings: number, trigger: globalThis.HTMLElement] }>();
const dates = computed(() => getDatesInWeek(props.plan.weekStart));
function recipeFor(recipeId: string) {
  return props.recipes.find((recipe) => recipe.id === recipeId) ?? null;
}

function openDetails(event: globalThis.MouseEvent, meal: MealDto) {
  emit("openDetails", meal.recipeId, meal.servings, event.currentTarget as globalThis.HTMLElement);
}
</script>

<template>
  <section class="mm-space-y-4" aria-labelledby="weekly-schedule-heading">
    <h2 id="weekly-schedule-heading" class="mm-text-xl font-semibold">Weekly schedule</h2>
    <div class="grid items-start mm-gap-4 sm:grid-cols-2">
      <section v-for="date in dates" :key="date" class="min-w-0 border-b border-line mm-pb-4">
        <h3 class="bg-field rounded-md mm-p-3 mm-text-base font-semibold">{{ formatDisplayDate(date) }}</h3>
        <div v-if="plan.skippedDates.includes(date)" class="mm-p-4 mm-text-sm font-medium text-muted">
          Skipped
        </div>
        <p v-else-if="!plan.meals.some((meal) => meal.date === date)" class="mm-p-4 mm-text-sm text-muted">No meals scheduled</p>
        <div v-else class="divide-y divide-line">
          <article
            v-for="meal in plan.meals.filter((candidate) => candidate.date === date)"
            :key="meal.id"
            class="min-w-0 overflow-hidden"
          >
            <a
              v-if="recipeFor(meal.recipeId)"
              :href="`/recipes/${meal.recipeId}`"
              class="focus-ring group block min-w-0 transition-colors hover:bg-field"
              @click.exact.left.prevent="openDetails($event, meal)"
            >
              <div class="flex min-w-0 flex-col mm-p-3">
                <p class="mm-text-xs font-semibold uppercase tracking-wide text-moss">{{ meal.slot || "Meal" }}</p>
                <h4 class="mm-display mm-mt-1 break-words mm-text-lg font-semibold leading-snug transition-colors group-hover:text-moss">{{ meal.recipeTitleSnapshot }}</h4>
                <p v-if="meal.notes" class="mm-mt-2 line-clamp-2 mm-text-sm text-steel">{{ meal.notes }}</p>
                <div class="mm-mt-2 flex flex-wrap mm-gap-4 mm-text-sm text-steel">
                  <span class="inline-flex items-center mm-gap-1">
                    <Clock :size="15" aria-hidden="true" /> {{ recipeFor(meal.recipeId)?.totalTimeMinutes }} min
                  </span>
                  <span class="inline-flex items-center mm-gap-1"><Users :size="15" aria-hidden="true" /> {{ meal.servings }} servings</span>
                </div>
                <span class="mt-auto self-start rounded-md mm-py-2 mm-text-sm font-semibold text-moss">Recipe details</span>
              </div>
            </a>
            <div v-else class="min-w-0">
              <div class="flex min-w-0 flex-col mm-p-3">
                <p class="mm-text-xs font-semibold uppercase tracking-wide text-moss">{{ meal.slot || "Meal" }}</p>
                <h4 class="mm-mt-1 break-words mm-text-lg font-semibold">{{ meal.recipeTitleSnapshot }}</h4>
                <p v-if="meal.notes" class="mm-mt-2 line-clamp-2 mm-text-sm text-steel">{{ meal.notes }}</p>
                <div class="mm-mt-2 flex flex-wrap mm-gap-4 mm-text-sm text-steel">
                  <span class="inline-flex items-center mm-gap-1"><Users :size="15" aria-hidden="true" /> {{ meal.servings }} servings</span>
                </div>
                <p class="mt-auto mm-pt-3 mm-text-xs text-muted">Recipe no longer in library</p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
