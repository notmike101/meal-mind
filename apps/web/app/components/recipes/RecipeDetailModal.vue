<script setup lang="ts">
import { AlertTriangle, LoaderCircle, X } from "@lucide/vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { errorMessage } from "~/composables/use-api";
import { useRecipeModal } from "~/composables/use-recipe-modal";
import { useRecipesStore } from "~/stores/recipes";

const props = defineProps<{ recipeId: string; servings: number }>();
const recipes = useRecipesStore();
const modal = useRecipeModal();
const dialog = ref<globalThis.HTMLDialogElement | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedServings = ref(props.servings);
const recipe = computed(() => recipes.details[props.recipeId]);
let previousBodyOverflow = "";

watch(() => [props.recipeId, props.servings] as const, async ([recipeId, servings]) => {
  selectedServings.value = servings;
  loading.value = true;
  error.value = null;
  try {
    await recipes.fetchRecipe(recipeId, selectedServings.value);
  } catch (caught) {
    error.value = errorMessage(caught, "Recipe details could not be loaded.");
  } finally {
    loading.value = false;
  }
}, { immediate: true });

async function updateServings(servings: number) {
  if (servings === selectedServings.value || loading.value) return;
  loading.value = true;
  error.value = null;
  try {
    await recipes.fetchRecipe(props.recipeId, servings);
    selectedServings.value = servings;
  } catch (caught) {
    error.value = errorMessage(caught, "Recipe servings could not be updated.");
  } finally {
    loading.value = false;
  }
}

async function retry() {
  if (loading.value) return;
  loading.value = true;
  error.value = null;
  try {
    await recipes.fetchRecipe(props.recipeId, selectedServings.value);
  } catch (caught) {
    error.value = errorMessage(caught, "Recipe details could not be loaded.");
  } finally {
    loading.value = false;
  }
}

function close() {
  modal.closeRecipe();
}

function closeFromBackdrop(event: globalThis.MouseEvent) {
  if (event.target !== dialog.value || !dialog.value) return;
  const bounds = dialog.value.getBoundingClientRect();
  const outside = event.clientX < bounds.left || event.clientX > bounds.right
    || event.clientY < bounds.top || event.clientY > bounds.bottom;
  if (outside) close();
}

onMounted(async () => {
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  await nextTick();
  dialog.value?.showModal();
});

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow;
  modal.restoreTriggerFocus();
});
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      :aria-label="recipe || error ? undefined : 'Recipe details'"
      :aria-labelledby="recipe || error ? 'recipe-modal-heading' : undefined"
      :aria-busy="loading"
      class="m-0 h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-hidden border-0 bg-canvas p-0 text-ink shadow-2xl backdrop:bg-ink/65 sm:m-auto sm:h-auto sm:max-h-[90dvh] sm:w-[calc(100%-2rem)] sm:max-w-[74rem] sm:rounded-3xl sm:border sm:border-line/25"
      @cancel.prevent="close"
      @click="closeFromBackdrop"
      @keydown.esc.prevent="close"
    >
      <div class="flex h-full max-h-[100dvh] flex-col sm:max-h-[90dvh]">
        <header class="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-line/20 bg-surface/95 px-4 py-2 backdrop-blur sm:px-6">
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-moss">Recipe details</p>
            <p v-if="loading && recipe" class="mt-0.5 flex items-center gap-1.5 text-xs text-ink/55" role="status">
              <LoaderCircle :size="13" class="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Updating quantities…
            </p>
          </div>
          <button
            type="button"
            aria-label="Close recipe details"
            class="focus-ring flex h-[44px] min-h-[44px] w-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-line/25 bg-surface text-ink/65 transition hover:border-line/50 hover:bg-field hover:text-ink"
            autofocus
            @click="close"
          >
            <X :size="21" aria-hidden="true" />
          </button>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:p-6 lg:p-8">
          <div v-if="loading && !recipe" class="flex min-h-[55dvh] flex-col items-center justify-center text-center" role="status">
            <span class="flex h-14 w-14 items-center justify-center rounded-full bg-moss/10 text-moss">
              <LoaderCircle :size="26" class="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            </span>
            <p class="mt-4 text-sm font-semibold text-ink/65">Loading recipe details…</p>
          </div>
          <div v-else-if="error && !recipe" class="mx-auto flex min-h-[55dvh] max-w-lg flex-col items-center justify-center text-center">
            <span class="flex h-14 w-14 items-center justify-center rounded-full bg-tomato/10 text-tomato">
              <AlertTriangle :size="26" aria-hidden="true" />
            </span>
            <h1 id="recipe-modal-heading" class="mt-5 text-2xl font-semibold tracking-tight">Recipe unavailable</h1>
            <p role="alert" class="mt-2 text-sm leading-6 text-ink/60">{{ error }}</p>
            <div class="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" class="focus-ring mm-button-primary rounded-xl px-5 py-2.5 text-sm font-semibold" @click="retry">Try again</button>
              <button type="button" class="focus-ring mm-button-secondary rounded-xl px-5 py-2.5 text-sm font-semibold" @click="close">Close</button>
            </div>
          </div>
          <template v-else-if="recipe">
            <div v-if="error" role="alert" class="mb-5 flex items-start gap-3 rounded-2xl border border-tomato/25 bg-tomato/5 p-4 text-sm text-tomato">
              <AlertTriangle :size="18" class="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{{ error }}</span>
            </div>
            <RecipesRecipeDetails
              :recipe="recipe"
              :servings="selectedServings"
              :disabled="loading"
              heading-id="recipe-modal-heading"
              embedded
              @update-servings="updateServings"
            />
          </template>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
