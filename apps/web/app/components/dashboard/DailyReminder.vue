<script setup lang="ts">
import type { MealDto } from "@mealmind/contracts";
import { Check, X } from "@lucide/vue";
import { computed, ref } from "vue";
import { usePlanningStore } from "~/stores/planning";

const props = defineProps<{ meals: MealDto[] }>();
const planning = usePlanningStore();
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
</script>

<template>
  <section class="rounded-md bg-surface mm-p-5 shadow-line">
    <div class="flex flex-col mm-gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="mm-text-sm font-medium uppercase tracking-wide text-moss">Today</p>
        <h2 class="mm-mt-1 mm-text-xl font-semibold">Active meals</h2>
      </div>
      <span v-if="plannedMeals.length" class="rounded-md bg-tomato/10 mm-px-3 mm-py-1 mm-text-sm font-medium text-tomato">
        {{ plannedMeals.length }} meal{{ plannedMeals.length === 1 ? "" : "s" }} still planned
      </span>
      <span v-else class="rounded-md bg-moss/10 mm-px-3 mm-py-1 mm-text-sm font-medium text-moss">All handled</span>
    </div>
    <div class="mm-mt-4 grid mm-gap-3 md:grid-cols-2">
      <div v-for="meal in meals" :key="meal.id" class="rounded-md border border-ink/10 mm-p-4">
        <p class="mm-text-xs font-semibold uppercase text-moss">{{ meal.slot || "Meal" }}</p>
        <h3 class="mm-mt-1 font-semibold">{{ meal.recipeTitleSnapshot }}</h3>
        <p class="mm-mt-1 mm-text-sm text-ink/60">
          {{ meal.servings }} serving{{ meal.servings === 1 ? "" : "s" }} · {{ meal.status }}
        </p>
        <div class="mm-mt-3 flex mm-gap-2">
          <button
            type="button"
            :disabled="busyMealId === meal.id"
            class="focus-ring inline-flex items-center mm-gap-2 rounded-md bg-moss mm-px-3 mm-py-2 mm-text-sm font-semibold text-white"
            @click="update(meal.id, 'done')"
          >
            <Check :size="15" aria-hidden="true" /> Done
          </button>
          <button
            type="button"
            :disabled="busyMealId === meal.id"
            class="focus-ring inline-flex items-center mm-gap-2 rounded-md border border-ink/15 mm-px-3 mm-py-2 mm-text-sm font-medium"
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
