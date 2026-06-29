<script setup lang="ts">
import type { MealSlotDto, RecipeSummaryDto } from "@mealmind/contracts";
import { computed, ref, watch } from "vue";
import { errorMessage } from "~/composables/use-api";
import { usePlanningStore } from "~/stores/planning";
import { formatDisplayDate } from "~/utils/dates";

const props = defineProps<{
  planId: string;
  mealSlot: MealSlotDto;
  recipes: Pick<RecipeSummaryDto, "id" | "title" | "mealTypes" | "tags">[];
  locked: boolean;
}>();
const planning = usePlanningStore();
const servings = ref(props.mealSlot.servings);
const selectedRecipeId = ref(props.mealSlot.recipeId);
const busy = ref(false);
const error = ref<string | null>(null);
const compatibleRecipes = computed(() => props.recipes.filter((recipe) => recipe.mealTypes.includes(props.mealSlot.mealType)));

watch(() => props.mealSlot, (slot) => {
  servings.value = slot.servings;
  selectedRecipeId.value = slot.recipeId;
});

async function updateServings(nextServings: number) {
  if (nextServings < 1 || nextServings > 12) return;
  busy.value = true;
  error.value = null;
  try {
    await planning.updateServings(props.planId, props.mealSlot.id, nextServings);
    servings.value = nextServings;
  } catch (caught) {
    error.value = errorMessage(caught, "Could not update servings.");
  } finally {
    busy.value = false;
  }
}

async function swap(mode: "manual" | "ai") {
  busy.value = true;
  error.value = null;
  try {
    await planning.swap(props.planId, props.mealSlot.id, mode, selectedRecipeId.value);
  } catch (caught) {
    error.value = errorMessage(caught, "Could not swap recipe.");
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <article class="min-h-[210px] rounded-md bg-surface p-4 shadow-line">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase text-moss">{{ mealSlot.mealType }}</p>
        <h3 class="mt-1 text-base font-semibold leading-snug">{{ mealSlot.recipeTitleSnapshot }}</h3>
        <p class="mt-1 text-xs text-ink/55">{{ formatDisplayDate(mealSlot.date) }}</p>
      </div>
      <span class="rounded-md bg-field px-2 py-1 text-xs font-medium text-ink/65">{{ mealSlot.status }}</span>
    </div>
    <p v-if="mealSlot.notes" class="mt-3 line-clamp-2 text-sm text-ink/65">{{ mealSlot.notes }}</p>
    <div class="mt-4">
      <PlanServingsStepper :servings="servings" :disabled="locked || busy" @update="updateServings" />
    </div>
    <div class="mt-4">
      <PlanRecipeSwapControls
        v-model:selected-recipe-id="selectedRecipeId"
        :recipes="compatibleRecipes"
        :current-recipe-id="mealSlot.recipeId"
        :disabled="locked"
        :busy="busy"
        @swap="swap"
      />
    </div>
    <p v-if="locked" class="mt-3 text-xs text-ink/55">Locked plans cannot be edited.</p>
    <p v-if="error" class="mt-3 text-sm text-tomato">{{ error }}</p>
  </article>
</template>
