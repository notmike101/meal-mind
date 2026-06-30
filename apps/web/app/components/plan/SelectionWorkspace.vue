<script setup lang="ts">
import type { MealPlanDto, MealSlotDto, RecipeSummaryDto } from "@mealmind/contracts";
import { RefreshCw, Search, TriangleAlert } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { errorMessage } from "~/composables/use-api";
import { usePlanningStore } from "~/stores/planning";
import { formatDisplayDate } from "~/utils/dates";

const props = defineProps<{ plan: MealPlanDto; recipes: RecipeSummaryDto[] }>();
const planning = usePlanningStore();
const activeSlotId = ref(props.plan.slots[0]?.id ?? "");
const search = ref("");
const activeTag = ref<string | null>(null);
const busy = ref(false);
const error = ref<string | null>(null);

const availableSlots = computed(() => props.plan.slots.filter((slot) => !props.plan.skippedDates.includes(slot.date)));

const activeSlot = computed(() => availableSlots.value.find((slot) => slot.id === activeSlotId.value) ?? availableSlots.value[0]);
const currentRecipe = computed(() => props.recipes.find((recipe) => recipe.id === activeSlot.value?.recipeId) ?? null);
const compatibleRecipes = computed(() => props.recipes);
const availableTags = computed(() => [...new Set(compatibleRecipes.value.flatMap((recipe) => recipe.tags))].sort((a, b) => a.localeCompare(b)));
const filteredRecipes = computed(() => {
  const query = search.value.trim().toLowerCase();
  return compatibleRecipes.value.filter((recipe) => {
    if (activeTag.value && !recipe.tags.includes(activeTag.value)) return false;
    if (!query) return true;
    return [recipe.title, recipe.description, ...recipe.tags].join(" ").toLowerCase().includes(query);
  });
});

watch(() => props.plan.slots, (slots) => {
  if (!slots.some((slot) => slot.id === activeSlotId.value)) activeSlotId.value = availableSlots.value[0]?.id ?? "";
});
watch(() => props.plan.skippedDates, () => {
  if (!availableSlots.value.some((slot) => slot.id === activeSlotId.value)) {
    activeSlotId.value = availableSlots.value[0]?.id ?? "";
  }
});
watch(compatibleRecipes, () => {
  if (activeTag.value && !availableTags.value.includes(activeTag.value)) activeTag.value = null;
});

function usedCount(recipeId: string) {
  return props.plan.slots.filter((slot) => slot.recipeId === recipeId).length;
}

function selectSlot(slotId: string) {
  activeSlotId.value = slotId;
  search.value = "";
  activeTag.value = null;
  error.value = null;
}

async function chooseRecipe(recipeId: string) {
  if (!activeSlot.value || busy.value || recipeId === activeSlot.value.recipeId) return;
  await runChange(
    () => planning.swap(props.plan.id, activeSlot.value!.id, "manual", recipeId),
    "Could not select that recipe.",
  );
}

async function chooseWithAi() {
  if (!activeSlot.value || busy.value) return;
  await runChange(
    () => planning.swap(props.plan.id, activeSlot.value!.id, "ai"),
    "Could not generate another suggestion.",
  );
}

async function updateServings(servings: number) {
  if (!activeSlot.value || busy.value) return;
  await runChange(
    () => planning.updateServings(props.plan.id, activeSlot.value!.id, servings),
    "Could not update servings.",
  );
}

async function toggleDay(date: string, skipped: boolean) {
  if (busy.value) return;
  await runChange(
    () => planning.setDaySkipped(props.plan.id, date, skipped),
    `Could not ${skipped ? "skip" : "restore"} that day.`,
  );
}

async function runChange(change: () => Promise<void>, fallback: string) {
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

function slotLabel(slot: MealSlotDto) {
  return `${formatDisplayDate(slot.date)} ${slot.mealType}`;
}
</script>

<template>
  <div class="space-y-6">
    <PlanScheduleStrip
      :plan="plan"
      :active-slot-id="activeSlotId"
      :busy="busy"
      @select="selectSlot"
      @toggle-day="toggleDay"
    />

    <section v-if="activeSlot" class="rounded-xl border border-ink/10 bg-surface p-4 shadow-sm sm:p-5">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wide text-moss">Choosing for {{ slotLabel(activeSlot) }}</p>
          <h2 class="mt-1 truncate text-xl font-semibold">{{ activeSlot.recipeTitleSnapshot }}</h2>
          <p v-if="activeSlot.notes" class="mt-1 line-clamp-2 text-sm text-ink/60">{{ activeSlot.notes }}</p>
          <p v-if="!currentRecipe" class="mt-2 inline-flex items-center gap-2 text-sm text-tomato">
            <TriangleAlert :size="16" aria-hidden="true" /> This recipe is no longer in the library. Choose a replacement below.
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <PlanServingsStepper :servings="activeSlot.servings" :disabled="busy" @update="updateServings" />
          <button
            type="button"
            :disabled="busy || compatibleRecipes.length === 0"
            class="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-ink/15 px-4 py-2 text-sm font-semibold hover:bg-field"
            @click="chooseWithAi"
          >
            <RefreshCw :size="16" :class="busy ? 'animate-spin' : ''" aria-hidden="true" /> AI pick
          </button>
        </div>
      </div>
      <p v-if="error" role="alert" class="mt-4 text-sm text-tomato">{{ error }}</p>
    </section>

    <section v-if="activeSlot" aria-labelledby="recipe-catalog-heading">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-sm font-medium uppercase tracking-wide text-moss">Recipe catalog</p>
          <h2 id="recipe-catalog-heading" class="mt-1 text-2xl font-semibold">Choose {{ activeSlot.mealType }}</h2>
        </div>
        <label class="relative block w-full lg:max-w-md">
          <span class="sr-only">Search recipes</span>
          <Search class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/45" :size="19" aria-hidden="true" />
          <input
            v-model="search"
            type="search"
            placeholder="Search recipes"
            class="focus-ring w-full rounded-md border border-ink/15 bg-surface py-3 pl-10 pr-4 text-sm"
          >
        </label>
      </div>
      <div v-if="availableTags.length" class="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Recipe tags">
        <button
          type="button"
          :aria-pressed="activeTag === null"
          class="focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-medium"
          :class="activeTag === null ? 'bg-strong text-strong-foreground' : 'bg-field hover:bg-moss/10'"
          @click="activeTag = null"
        >
          All
        </button>
        <button
          v-for="tag in availableTags"
          :key="tag"
          type="button"
          :aria-pressed="activeTag === tag"
          class="focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-medium"
          :class="activeTag === tag ? 'bg-strong text-strong-foreground' : 'bg-field hover:bg-moss/10'"
          @click="activeTag = tag"
        >
          {{ tag }}
        </button>
      </div>

      <div v-if="filteredRecipes.length" class="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <PlanRecipeSelectionCard
          v-for="recipe in filteredRecipes"
          :key="recipe.id"
          :recipe="recipe"
          :selected="recipe.id === activeSlot.recipeId"
          :used-count="usedCount(recipe.id)"
          :action-label="`Choose for ${formatDisplayDate(activeSlot.date)}`"
          :disabled="busy"
          @choose="chooseRecipe(recipe.id)"
        />
      </div>
      <div v-else class="mt-5 rounded-xl border border-dashed border-ink/20 bg-surface p-8 text-center text-ink/65">
        {{ compatibleRecipes.length === 0
          ? `No ${activeSlot.mealType} recipes are available in the library.`
          : "No recipes match the current search and tag filters." }}
      </div>
    </section>
  </div>
</template>
