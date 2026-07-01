<script setup lang="ts">
import { X } from "@lucide/vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { errorMessage } from "~/composables/use-api";
import { useRecipeModal } from "~/composables/use-recipe-modal";
import { useRecipesStore } from "~/stores/recipes";

const props = defineProps<{ recipeId: string }>();
const recipes = useRecipesStore();
const modal = useRecipeModal();
const dialog = ref<globalThis.HTMLDialogElement | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const recipe = computed(() => recipes.details[props.recipeId]);
let previousBodyOverflow = "";

watch(() => props.recipeId, async (recipeId) => {
  if (recipes.details[recipeId]) return;
  loading.value = true;
  error.value = null;
  try {
    await recipes.fetchRecipe(recipeId);
  } catch (caught) {
    error.value = errorMessage(caught, "Recipe details could not be loaded.");
  } finally {
    loading.value = false;
  }
}, { immediate: true });

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
      class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-6xl overflow-hidden rounded-xl bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/55"
      @cancel.prevent="close"
      @click="closeFromBackdrop"
    >
      <div class="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div class="flex justify-end border-b border-ink/10 px-3 py-2 sm:px-5">
          <button type="button" aria-label="Close recipe details" class="focus-ring rounded-md p-2 hover:bg-field" autofocus @click="close">
            <X :size="20" aria-hidden="true" />
          </button>
        </div>
        <div class="min-h-0 overflow-y-auto p-4 sm:p-6">
          <div v-if="loading" class="py-16 text-center text-sm text-ink/65" role="status">Loading recipe details…</div>
          <div v-else-if="error" class="mx-auto max-w-lg py-16 text-center">
            <h1 id="recipe-modal-heading" class="text-xl font-semibold">Recipe unavailable</h1>
            <p role="alert" class="mt-2 text-sm text-tomato">{{ error }}</p>
            <button type="button" class="focus-ring mt-5 rounded-md bg-strong px-4 py-2 text-sm font-semibold text-strong-foreground" @click="close">Close</button>
          </div>
          <RecipesRecipeDetails v-else-if="recipe" :recipe="recipe" heading-id="recipe-modal-heading" embedded />
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
