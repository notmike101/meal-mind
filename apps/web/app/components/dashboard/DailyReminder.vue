<script setup lang="ts">
import type { MealDto } from "@mealmind/contracts";
import { Check, CircleCheckBig, Utensils, X } from "@lucide/vue";
import { computed, ref } from "vue";
import { usePlanningStore } from "~/stores/planning";

const props = defineProps<{ meals: MealDto[] }>();
const planning = usePlanningStore();
const emit = defineEmits<{ openDetails: [recipeId: string, servings: number, trigger: globalThis.HTMLElement] }>();
const busyMealId = ref<string | null>(null);
const plannedMeals = computed(() => props.meals.filter((meal) => meal.status === "planned"));

async function update(mealId: string, status: "done" | "skipped") {
  busyMealId.value = mealId;
  try {
    await planning.updateAdherence(mealId, status);
  } finally {
    busyMealId.value = null;
  }
}

function openRecipe(event: globalThis.MouseEvent, meal: MealDto) {
  emit("openDetails", meal.recipeId, meal.servings, event.currentTarget as globalThis.HTMLElement);
}
</script>

<template>
  <section class="mm-panel overflow-hidden mm-p-5 sm:p-6">
    <div class="flex flex-col mm-gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center mm-gap-3">
        <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-moss/10 text-moss">
          <Utensils :size="21" aria-hidden="true" />
        </span>
        <div>
          <p class="mm-text-xs font-bold uppercase tracking-[0.14em] text-moss">Today</p>
          <h2 class="mm-mt-1 mm-text-xl font-bold">Active meals</h2>
        </div>
      </div>
      <span v-if="plannedMeals.length" class="rounded-full border border-tomato/15 bg-tomato/10 mm-px-3 mm-py-2 mm-text-sm font-bold text-tomato">
        {{ plannedMeals.length }} meal{{ plannedMeals.length === 1 ? "" : "s" }} still planned
      </span>
      <span v-else class="inline-flex items-center mm-gap-2 rounded-full border border-moss/15 bg-moss/10 mm-px-3 mm-py-2 mm-text-sm font-bold text-moss">
        <CircleCheckBig :size="16" aria-hidden="true" /> All handled
      </span>
    </div>
    <div class="mm-mt-5 grid mm-gap-4 md:grid-cols-2">
      <div v-for="meal in meals" :key="meal.id" class="mm-card mm-interactive flex flex-col mm-p-5">
        <p class="mm-text-xs font-bold uppercase tracking-[0.14em] text-moss">{{ meal.slot || "Meal" }}</p>
        <h3 class="mm-mt-2 mm-text-lg font-bold leading-snug">
          <a
            :href="`/recipes/${encodeURIComponent(meal.recipeId)}`"
            class="focus-ring rounded-sm text-ink decoration-moss/50 underline-offset-4 hover:text-moss hover:underline"
            @click.exact.left.prevent="openRecipe($event, meal)"
          >{{ meal.recipeTitleSnapshot }}</a>
        </h3>
        <p class="mm-mt-2 mm-text-sm text-ink/55">
          {{ meal.servings }} serving{{ meal.servings === 1 ? "" : "s" }} · {{ meal.status }}
        </p>
        <div class="mt-auto flex mm-gap-2 mm-pt-4">
          <button
            type="button"
            :disabled="busyMealId === meal.id"
            class="focus-ring mm-button-primary inline-flex items-center mm-gap-2 mm-px-3 mm-py-2 mm-text-sm font-bold"
            @click="update(meal.id, 'done')"
          >
            <Check :size="15" aria-hidden="true" /> Done
          </button>
          <button
            type="button"
            :disabled="busyMealId === meal.id"
            class="focus-ring mm-button-secondary inline-flex items-center mm-gap-2 mm-px-3 mm-py-2 mm-text-sm font-semibold"
            @click="update(meal.id, 'skipped')"
          >
            <X :size="15" aria-hidden="true" /> Skipped
          </button>
        </div>
      </div>
    </div>
    <p v-if="meals.length === 0" class="mm-mt-4 mm-text-sm text-ink/60">No active meals for today.</p>
  </section>
</template>
