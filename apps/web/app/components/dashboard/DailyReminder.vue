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
  <section class="rounded-md bg-surface p-5 shadow-line">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-medium uppercase tracking-wide text-moss">Today</p>
        <h2 class="mt-1 text-xl font-semibold">Active meals</h2>
      </div>
      <span v-if="plannedMeals.length" class="rounded-md bg-tomato/10 px-3 py-1 text-sm font-medium text-tomato">
        {{ plannedMeals.length }} meal{{ plannedMeals.length === 1 ? "" : "s" }} still planned
      </span>
      <span v-else class="rounded-md bg-moss/10 px-3 py-1 text-sm font-medium text-moss">All handled</span>
    </div>
    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <div v-for="meal in meals" :key="meal.id" class="rounded-md border border-ink/10 p-4">
        <p class="text-xs font-semibold uppercase text-moss">{{ meal.slot || "Meal" }}</p>
        <h3 class="mt-1 font-semibold">{{ meal.recipeTitleSnapshot }}</h3>
        <p class="mt-1 text-sm text-ink/60">
          {{ meal.servings }} serving{{ meal.servings === 1 ? "" : "s" }} · {{ meal.status }}
        </p>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            :disabled="busyMealId === meal.id"
            class="focus-ring inline-flex items-center gap-2 rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white"
            @click="update(meal.id, 'done')"
          >
            <Check :size="15" aria-hidden="true" /> Done
          </button>
          <button
            type="button"
            :disabled="busyMealId === meal.id"
            class="focus-ring inline-flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-medium"
            @click="update(meal.id, 'skipped')"
          >
            <X :size="15" aria-hidden="true" /> Skipped
          </button>
        </div>
      </div>
    </div>
    <p v-if="meals.length === 0" class="mt-4 text-sm text-ink/60">No active meals for today.</p>
  </section>
</template>
