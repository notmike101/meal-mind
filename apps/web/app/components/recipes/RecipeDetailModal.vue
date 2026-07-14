<script setup lang="ts">
import { X } from "@lucide/vue";
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
      aria-labelledby="recipe-modal-heading"
      class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] mm-max-w-6xl overflow-hidden rounded-sm border border-line/40 bg-surface p-0 text-ink shadow-none backdrop:bg-ink/70"
      @cancel.prevent="close"
      @click="closeFromBackdrop"
    >
      <div class="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div class="flex justify-end border-b border-ink/10 mm-px-3 mm-py-2 sm:px-5">
          <button type="button" aria-label="Close recipe details" class="focus-ring rounded-md mm-p-2 hover:bg-field" autofocus @click="close">
            <X :size="20" aria-hidden="true" />
          </button>
        </div>
        <div class="min-h-0 overflow-y-auto mm-p-4 sm:p-6">
          <div v-if="loading" class="mm-py-16 text-center mm-text-sm text-ink/65" role="status">Loading recipe details…</div>
          <div v-else-if="error" class="mx-auto mm-max-w-lg mm-py-16 text-center">
            <h1 id="recipe-modal-heading" class="mm-text-xl font-semibold">Recipe unavailable</h1>
            <p role="alert" class="mm-mt-2 mm-text-sm text-tomato">{{ error }}</p>
            <button type="button" class="focus-ring mm-mt-5 rounded-md bg-strong mm-px-4 mm-py-2 mm-text-sm font-semibold text-strong-foreground" @click="close">Close</button>
          </div>
          <RecipesRecipeDetails
            v-else-if="recipe"
            :recipe="recipe"
            :servings="selectedServings"
            :disabled="loading"
            heading-id="recipe-modal-heading"
            embedded
            @update-servings="updateServings"
          />
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
