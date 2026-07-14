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
  <section class="overflow-hidden border border-line/30 bg-surface">
    <div class="flex flex-col mm-gap-3 border-b border-line/25 mm-p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div class="flex items-center mm-gap-4">
        <span class="flex h-11 w-11 items-center justify-center border border-ink bg-ink text-canvas">
          <Utensils :size="20" aria-hidden="true" />
        </span>
        <div>
          <p class="mm-text-xs font-bold uppercase tracking-[0.18em] text-moss">Service 01 · Today</p>
          <h2 class="mm-display mm-mt-1 mm-text-2xl font-semibold tracking-tight">Active meals</h2>
        </div>
      </div>
      <span v-if="plannedMeals.length" class="border-l-2 border-tomato mm-px-3 mm-py-1 mm-text-sm font-bold text-tomato">
        {{ plannedMeals.length }} meal{{ plannedMeals.length === 1 ? "" : "s" }} still planned
      </span>
      <span v-else class="inline-flex items-center mm-gap-2 border-l-2 border-moss mm-px-3 mm-py-1 mm-text-sm font-bold text-moss">
        <CircleCheckBig :size="16" aria-hidden="true" /> All handled
      </span>
    </div>
    <div class="grid md:grid-cols-2 md:divide-x md:divide-line/25">
      <div v-for="meal in meals" :key="meal.id" class="flex min-h-56 flex-col border-b border-line/20 mm-p-5 last:border-b-0 md:border-b-0 sm:p-6">
        <p class="mm-text-xs font-bold uppercase tracking-[0.18em] text-moss">{{ meal.slot || "Meal" }}</p>
        <h3 class="mm-display mm-mt-3 mm-text-2xl font-semibold leading-tight tracking-[-0.025em]">
          <a
            :href="`/recipes/${encodeURIComponent(meal.recipeId)}`"
            class="focus-ring rounded-sm text-ink decoration-tomato/60 decoration-2 underline-offset-4 hover:underline"
            @click.exact.left.prevent="openRecipe($event, meal)"
          >{{ meal.recipeTitleSnapshot }}</a>
        </h3>
        <p class="mm-mt-3 mm-text-sm text-ink/55">
          {{ meal.servings }} serving{{ meal.servings === 1 ? "" : "s" }} · {{ meal.status }}
        </p>
        <div class="mt-auto flex mm-gap-3 mm-pt-6">
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
