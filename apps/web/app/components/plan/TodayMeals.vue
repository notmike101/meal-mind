<script setup lang="ts">
import type { MealDto, RecipeSummaryDto } from "@mealmind/contracts";
import { Check, CircleCheckBig, UtensilsCrossed, X } from "@lucide/vue";
import { computed, ref } from "vue";
import { errorMessage } from "~/composables/use-api";
import { usePlanningStore } from "~/stores/planning";

const props = defineProps<{ meals: MealDto[]; recipes: RecipeSummaryDto[] }>();
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
  <section class="mm-today-panel">
    <PlanRecipePhoto v-if="recipes.find(recipe => recipe.id === meals[0]?.recipeId)?.imageUrl" class="mm-today-hero" :image-url="recipes.find(recipe => recipe.id === meals[0]?.recipeId)?.imageUrl ?? null" :title="meals[0]?.recipeTitleSnapshot ?? 'Today'" />
    <SectionPanel title="Today's meals">
      <template #actions>
        <span v-if="plannedMeals.length" class="rounded-full bg-field mm-px-3 mm-py-2 mm-text-sm font-semibold text-warning">
          {{ plannedMeals.length }} meal{{ plannedMeals.length === 1 ? "" : "s" }} still planned
        </span>
        <span v-else class="inline-flex items-center mm-gap-2 rounded-full bg-field mm-px-3 mm-py-2 mm-text-sm font-semibold text-success">
          <CircleCheckBig :size="16" aria-hidden="true" /> All handled
        </span>
      </template>
      <div v-if="meals.length" class="mm-space-y-4">
        <article v-for="meal in meals" :key="meal.id" class="mm-today-meal min-w-0 border-b border-line mm-pb-4">
          <PlanRecipePhoto class="mm-today-photo" :image-url="recipes.find(recipe => recipe.id === meal.recipeId)?.imageUrl ?? null" :title="meal.recipeTitleSnapshot" />
          <div class="mm-today-meal-content">
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
          </div>
        </article>
      </div>
      <div v-else class="flex items-center mm-gap-3 mm-text-sm text-steel">
        <CircleCheckBig :size="20" class="shrink-0 text-success" aria-hidden="true" />
        <p>No meals scheduled for today.</p>
      </div>
      <p v-if="error" role="alert" class="mm-status-error mm-mt-4">{{ error }}</p>
    </SectionPanel>
    <aside class="mm-week-note" aria-label="A little weekly inspiration">
      <UtensilsCrossed :size="16" class="text-muted" aria-hidden="true" />
      <p class="mm-week-note-title">Good food<br>makes a better week.</p>
      <p class="mm-mt-2 mm-text-sm text-steel">Simple plans. Healthier days.</p>
      <span class="mm-week-note-rule" aria-hidden="true" />
    </aside>
  </section>
</template>
