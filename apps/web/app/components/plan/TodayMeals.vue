<script setup lang="ts">
import type { MealDto } from "@mealmind/contracts";
import { Check, CircleCheckBig, X } from "@lucide/vue";
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
  <SectionPanel title="Today's meals">
    <template #actions>
      <span v-if="plannedMeals.length" class="rounded-full bg-field mm-px-3 mm-py-2 mm-text-sm font-semibold text-warning">
        {{ plannedMeals.length }} meal{{ plannedMeals.length === 1 ? "" : "s" }} still planned
      </span>
      <span v-else class="inline-flex items-center mm-gap-2 rounded-full bg-field mm-px-3 mm-py-2 mm-text-sm font-semibold text-success">
        <CircleCheckBig :size="16" aria-hidden="true" /> All handled
      </span>
    </template>
    <div v-if="meals.length" class="grid mm-gap-4 xl:grid-cols-2">
      <article v-for="meal in meals" :key="meal.id" class="flex min-w-0 flex-col rounded-lg border border-line bg-canvas mm-p-4">
        <div class="flex flex-wrap items-center justify-between mm-gap-2">
          <p class="mm-text-xs font-semibold uppercase tracking-wide text-steel">{{ meal.slot || "Meal" }}</p>
          <span class="rounded-full bg-field mm-px-2.5 mm-py-1 mm-text-xs font-medium capitalize" :class="meal.status === 'done' ? 'text-success' : meal.status === 'planned' ? 'text-warning' : 'text-muted'">{{ meal.status }}</span>
        </div>
        <h3 class="mm-mt-3 break-words mm-text-xl font-semibold leading-snug">
          <a
            :href="`/recipes/${encodeURIComponent(meal.recipeId)}`"
            class="focus-ring rounded-md text-ink decoration-moss decoration-2 underline-offset-4 hover:underline"
            @click.exact.left.prevent="openRecipe($event, meal)"
          >{{ meal.recipeTitleSnapshot }}</a>
        </h3>
        <p class="mm-mt-2 mm-text-sm text-steel">{{ meal.servings }} serving{{ meal.servings === 1 ? "" : "s" }}</p>
        <div class="mt-auto flex flex-wrap mm-gap-3 mm-pt-4">
          <button type="button" :disabled="busyMealId === meal.id" class="focus-ring mm-button-primary inline-flex items-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-semibold" @click="update(meal.id, 'done')">
            <Check :size="15" aria-hidden="true" /> Done
          </button>
          <button type="button" :disabled="busyMealId === meal.id" class="focus-ring mm-button-secondary inline-flex items-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-semibold" @click="update(meal.id, 'skipped')">
            <X :size="15" aria-hidden="true" /> Skipped
          </button>
        </div>
      </article>
    </div>
    <div v-else class="flex items-center mm-gap-3 mm-text-sm text-steel">
      <CircleCheckBig :size="20" class="shrink-0 text-success" aria-hidden="true" />
      <p>No meals are scheduled for today. Your day is clear.</p>
    </div>
    <p v-if="error" role="alert" class="mm-status-error mm-mt-4">{{ error }}</p>
  </SectionPanel>
</template>
