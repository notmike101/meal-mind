<script setup lang="ts">
import type { MealPlanDto, RecipeSummaryDto } from "@mealmind/contracts";
import { Clock, Users } from "@lucide/vue";
import { computed } from "vue";
import { formatDisplayDate, getDatesInWeek } from "~/utils/dates";

const props = defineProps<{ plan: MealPlanDto; recipes: RecipeSummaryDto[] }>();
const dates = computed(() => getDatesInWeek(props.plan.weekStart));
function recipeFor(recipeId: string) {
  return props.recipes.find((recipe) => recipe.id === recipeId) ?? null;
}
</script>

<template>
  <div class="space-y-6">
    <section v-for="date in dates" :key="date" class="space-y-3">
      <h2 class="border-b border-ink/10 pb-2 text-xl font-semibold">{{ formatDisplayDate(date) }}</h2>
      <div class="grid gap-4 md:grid-cols-2">
        <article
          v-for="slot in plan.slots.filter((candidate) => candidate.date === date)"
          :key="slot.id"
          class="overflow-hidden rounded-xl border border-ink/10 bg-surface shadow-sm sm:grid sm:grid-cols-[180px_1fr]"
        >
          <PlanRecipePhoto :image-url="recipeFor(slot.recipeId)?.imageUrl ?? null" :title="slot.recipeTitleSnapshot" />
          <div class="flex flex-col p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-moss">{{ slot.mealType }}</p>
            <h3 class="mt-1 text-lg font-semibold">{{ slot.recipeTitleSnapshot }}</h3>
            <p v-if="slot.notes" class="mt-2 line-clamp-2 text-sm text-ink/60">{{ slot.notes }}</p>
            <div class="mt-4 flex flex-wrap gap-4 text-sm text-ink/65">
              <span v-if="recipeFor(slot.recipeId)" class="inline-flex items-center gap-1">
                <Clock :size="15" aria-hidden="true" /> {{ recipeFor(slot.recipeId)?.totalTimeMinutes }} min
              </span>
              <span class="inline-flex items-center gap-1"><Users :size="15" aria-hidden="true" /> {{ slot.servings }} servings</span>
            </div>
            <NuxtLink
              v-if="recipeFor(slot.recipeId)"
              :to="`/recipes/${slot.recipeId}`"
              class="focus-ring mt-auto self-start rounded-md py-2 text-sm font-semibold text-moss hover:underline"
            >
              Recipe details
            </NuxtLink>
            <p v-else class="mt-auto pt-3 text-xs text-ink/50">Recipe no longer in library</p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
