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
  <div class="mm-space-y-6">
    <section v-for="date in dates" :key="date" class="mm-space-y-3">
      <h2 class="border-b border-ink/10 mm-pb-2 mm-text-xl font-semibold">{{ formatDisplayDate(date) }}</h2>
      <div v-if="plan.skippedDates.includes(date)" class="rounded-md border border-dashed border-ink/15 bg-field mm-p-5 mm-text-sm font-medium text-ink/60">
        Skipped
      </div>
      <div v-else class="grid mm-gap-4 md:grid-cols-2">
        <article
          v-for="meal in plan.meals.filter((candidate) => candidate.date === date)"
          :key="meal.id"
          class="overflow-hidden rounded-xl border border-ink/10 bg-surface shadow-sm"
        >
          <a
            v-if="recipeFor(meal.recipeId)"
            :href="`/recipes/${meal.recipeId}`"
            class="focus-ring grid min-h-full rounded-xl transition hover:bg-field/40 sm:grid-cols-[180px_1fr]"
            @click.exact.left.prevent="openDetails($event, meal)"
          >
            <PlanRecipePhoto :image-url="recipeFor(meal.recipeId)?.imageUrl ?? null" :title="meal.recipeTitleSnapshot" />
            <div class="flex flex-col mm-p-4">
              <p class="mm-text-xs font-semibold uppercase tracking-wide text-moss">{{ meal.slot || "Meal" }}</p>
              <h3 class="mm-mt-1 mm-text-lg font-semibold">{{ meal.recipeTitleSnapshot }}</h3>
              <p v-if="meal.notes" class="mm-mt-2 line-clamp-2 mm-text-sm text-ink/60">{{ meal.notes }}</p>
              <div class="mm-mt-4 flex flex-wrap mm-gap-4 mm-text-sm text-ink/65">
                <span class="inline-flex items-center mm-gap-1">
                  <Clock :size="15" aria-hidden="true" /> {{ recipeFor(meal.recipeId)?.totalTimeMinutes }} min
                </span>
                <span class="inline-flex items-center mm-gap-1"><Users :size="15" aria-hidden="true" /> {{ meal.servings }} servings</span>
              </div>
              <span class="mt-auto self-start rounded-md mm-py-2 mm-text-sm font-semibold text-moss">Recipe details</span>
            </div>
          </a>
          <div v-else class="grid min-h-full sm:grid-cols-[180px_1fr]">
            <PlanRecipePhoto :image-url="null" :title="meal.recipeTitleSnapshot" />
            <div class="flex flex-col mm-p-4">
              <p class="mm-text-xs font-semibold uppercase tracking-wide text-moss">{{ meal.slot || "Meal" }}</p>
              <h3 class="mm-mt-1 mm-text-lg font-semibold">{{ meal.recipeTitleSnapshot }}</h3>
              <p v-if="meal.notes" class="mm-mt-2 line-clamp-2 mm-text-sm text-ink/60">{{ meal.notes }}</p>
              <div class="mm-mt-4 flex flex-wrap mm-gap-4 mm-text-sm text-ink/65">
                <span class="inline-flex items-center mm-gap-1"><Users :size="15" aria-hidden="true" /> {{ meal.servings }} servings</span>
              </div>
              <p class="mt-auto mm-pt-3 mm-text-xs text-ink/50">Recipe no longer in library</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
