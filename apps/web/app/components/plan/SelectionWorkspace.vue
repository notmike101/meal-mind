<script setup lang="ts">
import type { MealDto, MealPlanDto, RecipeSummaryDto } from "@mealmind/contracts";
import { RefreshCw, Save, Search, Trash2, TriangleAlert } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { errorMessage } from "~/composables/use-api";
import { usePlanningStore } from "~/stores/planning";
import { formatDisplayDate, getDatesInWeek } from "~/utils/dates";

const props = defineProps<{ plan: MealPlanDto; recipes: RecipeSummaryDto[]; defaultServings: number; pending?: boolean }>();
const emit = defineEmits<{ openDetails: [recipeId: string, servings: number, trigger: globalThis.HTMLElement] }>();
const planning = usePlanningStore();
const dates = computed(() => getDatesInWeek(props.plan.weekStart));
const availableMeals = computed(() => props.plan.meals.filter((meal) => !props.plan.skippedDates.includes(meal.date)));
const firstAvailableDate = () => dates.value.find((date) => !props.plan.skippedDates.includes(date)) ?? props.plan.weekStart;
const activeMealId = ref(availableMeals.value[0]?.id ?? "");
const addingDate = ref<string | null>(availableMeals.value.length === 0 && !props.plan.skippedDates.includes(firstAvailableDate()) ? firstAvailableDate() : null);
const selectedDate = ref(availableMeals.value[0]?.date ?? firstAvailableDate());
const search = ref("");
const activeTag = ref<string | null>(null);
const busy = ref(false);
const mutationBusy = computed(() => busy.value || Boolean(props.pending));
const error = ref<string | null>(null);
const addSlot = ref("");
const addServings = ref(props.defaultServings);
const editDate = ref(props.plan.meals[0]?.date ?? props.plan.weekStart);
const editSlot = ref(props.plan.meals[0]?.slot ?? "");

const activeMeal = computed(() => availableMeals.value.find((meal) => meal.id === activeMealId.value));
const currentRecipe = computed(() => props.recipes.find((recipe) => recipe.id === activeMeal.value?.recipeId) ?? null);
const availableTags = computed(() => [...new Set(props.recipes.flatMap((recipe) => recipe.tags))].sort((a, b) => a.localeCompare(b)));
const filteredRecipes = computed(() => {
  const query = search.value.trim().toLowerCase();
  return props.recipes.filter((recipe) => {
    if (activeTag.value && !recipe.tags.includes(activeTag.value)) return false;
    if (!query) return true;
    return [recipe.title, recipe.description, ...recipe.tags].join(" ").toLowerCase().includes(query);
  });
});

watch([() => props.plan.weekStart, availableMeals, () => props.plan.skippedDates], ([weekStart], [previousWeek]) => {
  if (weekStart !== previousWeek) {
    selectDate(availableMeals.value[0]?.date ?? firstAvailableDate());
    return;
  }
  if (activeMeal.value) {
    selectedDate.value = activeMeal.value.date;
    return;
  }
  if (addingDate.value && !props.plan.skippedDates.includes(addingDate.value)) return;
  selectDate(selectedDate.value);
});
watch(activeMeal, (meal) => {
  if (!meal) return;
  selectedDate.value = meal.date;
  editDate.value = meal.date;
  editSlot.value = meal.slot ?? "";
}, { immediate: true });
watch(availableTags, () => {
  if (activeTag.value && !availableTags.value.includes(activeTag.value)) activeTag.value = null;
});

function usedCount(recipeId: string) {
  return props.plan.meals.filter((meal) => meal.recipeId === recipeId).length;
}

function resetCatalog() {
  search.value = "";
  activeTag.value = null;
  error.value = null;
}

function selectMeal(mealId: string) {
  const meal = availableMeals.value.find((item) => item.id === mealId);
  if (!meal) return;
  selectedDate.value = meal.date;
  activeMealId.value = mealId;
  addingDate.value = null;
  resetCatalog();
}

function beginAdd(date: string) {
  if (props.plan.skippedDates.includes(date)) return;
  selectedDate.value = date;
  addingDate.value = date;
  activeMealId.value = "";
  addSlot.value = "";
  addServings.value = props.defaultServings;
  resetCatalog();
}

function selectDate(date: string) {
  if (selectedDate.value === date && (activeMeal.value?.date === date || (addingDate.value === date && !props.plan.skippedDates.includes(date)))) return;
  selectedDate.value = date;
  const meal = availableMeals.value.find((item) => item.date === date);
  if (meal) selectMeal(meal.id);
  else if (!props.plan.skippedDates.includes(date)) beginAdd(date);
  else {
    activeMealId.value = "";
    addingDate.value = null;
    resetCatalog();
  }
}

async function toggleDay(date: string, skipped: boolean) {
  if (mutationBusy.value) return;
  selectDate(date);
  await runChange(
    () => planning.setDaySkipped(props.plan.id, date, skipped),
    `Could not ${skipped ? "skip" : "restore"} that day.`,
  );
}

async function runChange(change: () => Promise<void>, fallback: string) {
  if (mutationBusy.value) return;
  busy.value = true;
  error.value = null;
  try {
    await change();
  } catch (caught) {
    error.value = errorMessage(caught, fallback);
  } finally {
    busy.value = false;
  }
}

async function chooseRecipe(recipeId: string) {
  if (mutationBusy.value) return;
  if (addingDate.value) {
    const date = addingDate.value;
    await runChange(async () => {
      await planning.addMeal(props.plan.id, {
        date,
        slot: addSlot.value,
        recipeId,
        servings: addServings.value,
      });
      const addedForDate = planning.selectedPlan?.meals.filter((meal) => meal.date === date) ?? [];
      activeMealId.value = addedForDate[addedForDate.length - 1]?.id ?? "";
      addingDate.value = null;
    }, "Could not add that meal.");
    return;
  }
  if (!activeMeal.value || recipeId === activeMeal.value.recipeId) return;
  await runChange(
    () => planning.swap(props.plan.id, activeMeal.value!.id, "manual", recipeId),
    "Could not select that recipe.",
  );
}

async function chooseWithAi() {
  if (!activeMeal.value || mutationBusy.value) return;
  await runChange(
    () => planning.swap(props.plan.id, activeMeal.value!.id, "ai"),
    "Could not generate another suggestion.",
  );
}

async function updateServings(servings: number) {
  if (!activeMeal.value || mutationBusy.value) return;
  await runChange(
    () => planning.updateMeal(props.plan.id, activeMeal.value!.id, { servings }),
    "Could not update servings.",
  );
}

async function saveDetails() {
  if (!activeMeal.value || mutationBusy.value) return;
  await runChange(
    () => planning.updateMeal(props.plan.id, activeMeal.value!.id, { date: editDate.value, slot: editSlot.value }),
    "Could not update meal details.",
  );
}

async function removeActiveMeal() {
  const meal = activeMeal.value;
  if (!meal || mutationBusy.value || !window.confirm(`Remove ${meal.recipeTitleSnapshot} from this plan?`)) return;
  await runChange(
    () => planning.removeMeal(props.plan.id, meal.id),
    "Could not remove that meal.",
  );
}

function mealLabel(meal: MealDto) {
  return `${formatDisplayDate(meal.date)} ${meal.slot || "Meal"}`;
}

function openRecipeDetails(recipeId: string, trigger: globalThis.HTMLElement) {
  emit("openDetails", recipeId, activeMeal.value?.servings ?? addServings.value, trigger);
}
</script>

<template>
  <div class="mm-plan-workspace">
    <PlanScheduleStrip
      :plan="plan"
      :active-meal-id="activeMealId"
      :adding-date="addingDate"
      :selected-date="selectedDate"
      :busy="mutationBusy"
      @select-date="selectDate"
      @select="selectMeal"
      @add="beginAdd"
      @toggle-day="toggleDay"
    />
    <div class="min-w-0 mm-space-y-4">
      <p v-if="pending" role="status" class="mm-text-sm text-steel">Refreshing week…</p>

      <SectionPanel v-if="addingDate" data-testid="meal-editor" title="Choose a recipe" :help="`Adding to ${formatDisplayDate(addingDate)}`">
        <div class="mm-mt-4 grid mm-gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label class="mm-space-y-2">
            <span class="mm-text-sm font-medium">Meal slot <span class="font-normal text-muted">(optional)</span></span>
            <input v-model="addSlot" :disabled="mutationBusy" list="meal-slot-suggestions" maxlength="50" placeholder="Breakfast, Dinner, Post-workout…" class="focus-ring mm-field w-full mm-px-3 mm-py-2" />
          </label>
          <PlanServingsStepper :servings="addServings" :disabled="mutationBusy" @update="addServings = $event" />
        </div>
      </SectionPanel>

      <SectionPanel v-else-if="activeMeal" data-testid="meal-editor" :title="activeMeal.recipeTitleSnapshot" :help="`Editing ${mealLabel(activeMeal)}`">
        <div class="flex flex-col mm-gap-4">
          <div class="min-w-0 flex-1">
            <p v-if="activeMeal.notes" class="mm-mt-1 line-clamp-2 mm-text-sm text-steel">{{ activeMeal.notes }}</p>
            <p v-if="!currentRecipe" class="mm-mt-2 inline-flex items-center mm-gap-2 mm-text-sm text-tomato">
              <TriangleAlert :size="16" aria-hidden="true" /> This recipe is no longer in the library. Choose a replacement below.
            </p>
            <div class="mm-mt-4 grid mm-gap-3 sm:grid-cols-2">
              <label class="mm-space-y-2">
                <span class="mm-text-sm font-medium">Date</span>
                <select v-model="editDate" :disabled="mutationBusy" class="focus-ring mm-field w-full mm-px-3 mm-py-2">
                  <option v-for="date in dates" :key="date" :value="date">{{ formatDisplayDate(date) }}</option>
                </select>
              </label>
              <label class="mm-space-y-2">
                <span class="mm-text-sm font-medium">Meal slot <span class="font-normal text-muted">(optional)</span></span>
                <input v-model="editSlot" :disabled="mutationBusy" list="meal-slot-suggestions" maxlength="50" placeholder="No slot" class="focus-ring mm-field w-full mm-px-3 mm-py-2" />
              </label>
            </div>
          </div>
          <div class="flex flex-col mm-gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <PlanServingsStepper :servings="activeMeal.servings" :disabled="mutationBusy" @update="updateServings" />
            <button type="button" :disabled="mutationBusy" class="focus-ring mm-button-secondary inline-flex items-center justify-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-semibold" @click="saveDetails">
              <Save :size="16" aria-hidden="true" /> Save details
            </button>
            <button type="button" :disabled="mutationBusy || recipes.length === 0" class="focus-ring mm-button-secondary inline-flex items-center justify-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-semibold" @click="chooseWithAi">
              <RefreshCw :size="16" :class="busy ? 'animate-spin' : ''" aria-hidden="true" /> AI pick
            </button>
            <button type="button" :disabled="mutationBusy" class="focus-ring mm-button-secondary mm-button-danger inline-flex items-center justify-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-semibold" @click="removeActiveMeal">
              <Trash2 :size="16" aria-hidden="true" /> Remove
            </button>
          </div>
        </div>
      </SectionPanel>

      <section v-else data-testid="meal-editor" class="mm-panel border-dashed mm-p-6 text-center text-steel">
        {{ plan.skippedDates.includes(selectedDate) ? "This day is skipped. Restore it in the schedule to add meals." : "Choose “Add meal” to start planning this day." }}
      </section>

      <p v-if="error" role="alert" class="mm-status-error">{{ error }}</p>

      <section v-if="addingDate || activeMeal" class="mm-pt-2" aria-labelledby="recipe-catalog-heading">
        <div class="flex flex-col mm-gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="recipe-catalog-heading" class="mm-mt-1 mm-text-xl font-semibold tracking-tight">{{ addingDate ? "Choose a meal" : "Change recipe" }}</h2>
          </div>
          <label class="relative block w-full lg:max-w-md">
            <span class="sr-only">Search recipes</span>
            <Search class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" :size="19" aria-hidden="true" />
            <input v-model="search" type="search" placeholder="Search recipes" class="focus-ring mm-field w-full mm-py-3 pl-10 pr-4 mm-text-sm" />
          </label>
        </div>
        <div v-if="availableTags.length" class="mm-mt-4 flex flex-wrap mm-gap-2 mm-pb-2" aria-label="Recipe tags">
          <button type="button" :aria-pressed="activeTag === null" class="focus-ring min-h-control min-w-0 max-w-full break-words rounded-md border border-control mm-px-4 mm-py-2 mm-text-sm font-semibold transition-colors" :class="activeTag === null ? 'border-moss bg-moss text-strong-foreground' : 'bg-surface text-ink hover:border-moss hover:bg-field'" @click="activeTag = null">All</button>
          <button v-for="tag in availableTags" :key="tag" type="button" :aria-pressed="activeTag === tag" class="focus-ring min-h-control min-w-0 max-w-full break-words rounded-md border border-control mm-px-4 mm-py-2 mm-text-sm font-semibold transition-colors" :class="activeTag === tag ? 'border-moss bg-moss text-strong-foreground' : 'bg-surface text-ink hover:border-moss hover:bg-field'" @click="activeTag = tag">{{ tag }}</button>
        </div>
        <div v-if="filteredRecipes.length" class="mm-mt-4 grid mm-gap-4 sm:grid-cols-2">
          <PlanRecipeSelectionCard
            v-for="recipe in filteredRecipes"
            :key="recipe.id"
            :recipe="recipe"
            :selected="!addingDate && recipe.id === activeMeal?.recipeId"
            :used-count="usedCount(recipe.id)"
            :action-label="addingDate ? `Add to ${formatDisplayDate(addingDate)}` : 'Choose recipe'"
            :disabled="mutationBusy"
            @choose="chooseRecipe(recipe.id)"
            @open-details="openRecipeDetails"
          />
        </div>
        <div v-else class="mm-panel mm-mt-5 border-dashed mm-p-8 text-center text-steel">No recipes match the current search and tag filters.</div>
      </section>

      <datalist id="meal-slot-suggestions">
        <option value="Breakfast" />
        <option value="Lunch" />
        <option value="Dinner" />
        <option value="Snack" />
      </datalist>
    </div>
  </div>
</template>
