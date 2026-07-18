<script setup lang="ts">
import { RefreshCw, Sparkles, X } from "@lucide/vue";
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { errorMessage } from "~/composables/use-api";
import { usePlanningStore } from "~/stores/planning";

const props = withDefaults(defineProps<{ weekStart: string; replaceExisting?: boolean; label?: string; defaultMealCount?: number }>(), {
  replaceExisting: false,
  label: undefined,
  defaultMealCount: 14,
});
const planning = usePlanningStore();
const busy = ref(false);
const open = ref(false);
const dialog = ref<globalThis.HTMLDialogElement | null>(null);
const mealCount = ref(props.defaultMealCount);
const error = ref<string | null>(null);
let previousBodyOverflow = "";

watch(() => props.defaultMealCount, (value) => {
  if (!open.value) mealCount.value = value;
});

watch(open, async (isOpen) => {
  if (isOpen) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    await nextTick();
    dialog.value?.showModal();
    return;
  }
  document.body.style.overflow = previousBodyOverflow;
});

onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow;
});

function closeDialog() {
  if (!busy.value) open.value = false;
}

function closeFromBackdrop(event: globalThis.MouseEvent) {
  if (event.target === dialog.value) closeDialog();
}

async function generate() {
  if (!Number.isSafeInteger(mealCount.value) || mealCount.value < 1) {
    error.value = "Meal count must be a positive integer.";
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    await planning.generate(props.weekStart, props.replaceExisting, mealCount.value);
    open.value = false;
  } catch (caught) {
    error.value = errorMessage(caught, "Could not generate plan.");
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="mm-space-y-2">
    <button
      type="button"
      :disabled="busy"
      class="focus-ring mm-button-primary inline-flex items-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-bold"
      @click="open = true"
    >
      <RefreshCw v-if="busy" :size="16" class="animate-spin" aria-hidden="true" />
      <Sparkles v-else :size="16" aria-hidden="true" />
      {{ busy ? "Generating" : label ?? (replaceExisting ? "Replace draft" : "Generate plan") }}
    </button>

    <Teleport to="body">
      <dialog
        v-if="open"
        ref="dialog"
        aria-labelledby="generate-plan-heading"
        aria-describedby="generate-plan-description"
        class="m-auto w-[calc(100%-2rem)] mm-max-w-md overflow-hidden rounded-3xl border border-line/20 bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/65"
        @cancel.prevent="closeDialog"
        @click="closeFromBackdrop"
        @keydown.esc.prevent="closeDialog"
      >
        <section class="mm-p-6 sm:p-7">
          <div class="flex items-start justify-between mm-gap-4">
            <div>
              <h2 id="generate-plan-heading" class="mm-text-xl font-bold">{{ replaceExisting ? "Replace draft plan" : "Generate plan" }}</h2>
              <p id="generate-plan-description" class="mm-mt-1 mm-text-sm text-ink/65">Choose how many meals the AI should plan across the week.</p>
            </div>
            <button type="button" :disabled="busy" aria-label="Close generation dialog" class="focus-ring rounded-xl mm-p-2 text-ink/60 transition-colors hover:bg-field hover:text-ink" @click="closeDialog">
              <X :size="18" aria-hidden="true" />
            </button>
          </div>
          <form class="mm-mt-5 mm-space-y-4" @submit.prevent="generate">
            <label class="block mm-space-y-2">
              <span class="mm-text-sm font-medium">Number of meals</span>
              <input v-model.number="mealCount" type="number" min="1" required autofocus class="focus-ring mm-field w-full mm-px-3 mm-py-2" />
            </label>
            <p v-if="replaceExisting" class="mm-text-sm text-tomato">The current editable draft and its shopping list will be replaced.</p>
            <p v-if="error" role="alert" class="mm-text-sm text-tomato">{{ error }}</p>
            <div class="flex justify-end mm-gap-2">
              <button type="button" :disabled="busy" class="focus-ring mm-button-secondary mm-px-4 mm-py-2 mm-text-sm font-semibold" @click="closeDialog">Cancel</button>
              <button type="submit" :disabled="busy" class="focus-ring mm-button-primary mm-px-4 mm-py-2 mm-text-sm font-bold">
                {{ busy ? "Generating" : replaceExisting ? "Replace plan" : "Generate plan" }}
              </button>
            </div>
          </form>
        </section>
      </dialog>
    </Teleport>
  </div>
</template>
