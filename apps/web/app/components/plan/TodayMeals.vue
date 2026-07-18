<script setup lang="ts">
import type { MealDto } from "@mealmind/contracts";
import { Check, CircleCheckBig, Utensils, X } from "@lucide/vue";
import { computed, ref } from "vue";
import { errorMessage } from "~/composables/use-api";
import { usePlanningStore } from "~/stores/planning";

const props = defineProps<{ meals: MealDto[] }>();
const planning = usePlanningStore();
const emit = defineEmits<{ openDetails: [recipeId: string, servings: number, trigger: globalThis.HTMLElement] }>();
const busyMealId = ref<string | null>(null);
const error = ref<string | null>(null);
const plannedMeals = computed(() => props.meals.filter((meal) => meal.status === "planned"));

async function update(mealId: string, status: "done" | "skipped") {
  busyMealId.value = mealId;
  error.value = null;
  try {
    await planning.updateAdherence(mealId, status);
  } catch (caught) {
    error.value = errorMessage(caught, "Could not update today's meal.");
  } finally {
    busyMealId.value = null;
  }
}

function openRecipe(event: globalThis.MouseEvent, meal: MealDto) {
  emit("openDetails", meal.recipeId, meal.servings, event.currentTarget as globalThis.HTMLElement);
}
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-line/25 bg-surface shadow-sm">
    <div class="flex flex-col gap-4 border-b border-line/20 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div class="flex items-center gap-4">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-moss/10 text-moss">
          <Utensils :size="20" aria-hidden="true" />
        </span>
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-moss">Today</p>
          <h2 class="mt-1 text-xl font-semibold tracking-tight text-ink">Today's meals</h2>
        </div>
      </div>
      <span v-if="plannedMeals.length" class="inline-flex w-fit items-center rounded-full bg-tomato/10 px-3 py-1.5 text-sm font-semibold text-tomato">
        {{ plannedMeals.length }} meal{{ plannedMeals.length === 1 ? "" : "s" }} still planned
      </span>
      <span v-else class="inline-flex w-fit items-center gap-2 rounded-full bg-moss/10 px-3 py-1.5 text-sm font-semibold text-moss">
        <CircleCheckBig :size="16" aria-hidden="true" /> All handled
      </span>
    </div>
    <div v-if="meals.length" class="grid gap-4 p-4 sm:p-5 xl:grid-cols-2">
      <article v-for="meal in meals" :key="meal.id" class="flex min-h-52 flex-col rounded-xl border border-line/20 bg-canvas/50 p-5 transition-colors hover:border-line/40">
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-moss">{{ meal.slot || "Meal" }}</p>
          <span class="rounded-full bg-field px-2.5 py-1 text-xs font-medium capitalize text-ink/60">{{ meal.status }}</span>
        </div>
        <h3 class="mt-3 text-xl font-semibold leading-snug tracking-[-0.02em]">
          <a
            :href="`/recipes/${encodeURIComponent(meal.recipeId)}`"
            class="focus-ring rounded-lg text-ink decoration-moss/50 decoration-2 underline-offset-4 hover:underline"
            @click.exact.left.prevent="openRecipe($event, meal)"
          >{{ meal.recipeTitleSnapshot }}</a>
        </h3>
        <p class="mt-2 text-sm text-ink/55">{{ meal.servings }} serving{{ meal.servings === 1 ? "" : "s" }}</p>
        <div class="mt-auto flex flex-wrap gap-3 pt-6">
          <button
            type="button"
            :disabled="busyMealId === meal.id"
            class="focus-ring mm-button-primary inline-flex min-h-11 items-center gap-2 px-3.5 py-2 text-sm font-semibold"
            @click="update(meal.id, 'done')"
          >
            <Check :size="15" aria-hidden="true" /> Done
          </button>
          <button
            type="button"
            :disabled="busyMealId === meal.id"
            class="focus-ring mm-button-secondary inline-flex min-h-11 items-center gap-2 px-3.5 py-2 text-sm font-semibold"
            @click="update(meal.id, 'skipped')"
          >
            <X :size="15" aria-hidden="true" /> Skipped
          </button>
        </div>
      </article>
    </div>
    <div v-else class="flex items-center gap-3 p-6 text-sm text-ink/60 sm:p-8">
      <CircleCheckBig :size="20" class="shrink-0 text-moss" aria-hidden="true" />
      <p>No meals are scheduled for today. Your day is clear.</p>
    </div>
    <p v-if="error" role="alert" class="mx-5 mb-5 rounded-xl bg-tomato/10 px-4 py-3 text-sm font-medium text-tomato">{{ error }}</p>
  </section>
</template>
