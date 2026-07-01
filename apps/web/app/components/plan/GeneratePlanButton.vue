<script setup lang="ts">
import { RefreshCw, Sparkles, X } from "@lucide/vue";
import { ref, watch } from "vue";
import { errorMessage } from "~/composables/use-api";
import { usePlanningStore } from "~/stores/planning";

const props = withDefaults(defineProps<{ replaceExisting?: boolean; label?: string; defaultMealCount?: number }>(), {
  replaceExisting: false,
  label: undefined,
  defaultMealCount: 14,
});
const planning = usePlanningStore();
const busy = ref(false);
const open = ref(false);
const mealCount = ref(props.defaultMealCount);
const error = ref<string | null>(null);

watch(() => props.defaultMealCount, (value) => {
  if (!open.value) mealCount.value = value;
});

async function generate() {
  if (!Number.isSafeInteger(mealCount.value) || mealCount.value < 1) {
    error.value = "Meal count must be a positive integer.";
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    await planning.generate(props.replaceExisting, mealCount.value);
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
      class="focus-ring inline-flex items-center mm-gap-2 rounded-md bg-moss mm-px-4 mm-py-2 mm-text-sm font-semibold text-white hover:bg-moss/90"
      @click="open = true"
    >
      <RefreshCw v-if="busy" :size="16" class="animate-spin" aria-hidden="true" />
      <Sparkles v-else :size="16" aria-hidden="true" />
      {{ busy ? "Generating" : label ?? (replaceExisting ? "Replace draft" : "Generate next week") }}
    </button>

    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" @click.self="open = false">
      <section role="dialog" aria-modal="true" aria-labelledby="generate-plan-heading" class="w-full mm-max-w-md rounded-xl bg-surface mm-p-5 shadow-xl">
        <div class="flex items-start justify-between mm-gap-4">
          <div>
            <h2 id="generate-plan-heading" class="mm-text-xl font-semibold">{{ replaceExisting ? "Replace draft plan" : "Generate next week" }}</h2>
            <p class="mm-mt-1 mm-text-sm text-ink/65">Choose how many meals the AI should plan across the week.</p>
          </div>
          <button type="button" aria-label="Close generation dialog" class="focus-ring rounded-md mm-p-2 hover:bg-field" @click="open = false">
            <X :size="18" aria-hidden="true" />
          </button>
        </div>
        <form class="mm-mt-5 mm-space-y-4" @submit.prevent="generate">
          <label class="block mm-space-y-2">
            <span class="mm-text-sm font-medium">Number of meals</span>
            <input v-model.number="mealCount" type="number" min="1" required class="focus-ring w-full rounded-md border border-ink/15 bg-surface mm-px-3 mm-py-2" />
          </label>
          <p v-if="replaceExisting" class="mm-text-sm text-tomato">The current editable draft and its shopping list will be replaced.</p>
          <p v-if="error" role="alert" class="mm-text-sm text-tomato">{{ error }}</p>
          <div class="flex justify-end mm-gap-2">
            <button type="button" class="focus-ring rounded-md border border-ink/15 mm-px-4 mm-py-2 mm-text-sm font-medium" @click="open = false">Cancel</button>
            <button type="submit" :disabled="busy" class="focus-ring rounded-md bg-moss mm-px-4 mm-py-2 mm-text-sm font-semibold text-white">
              {{ busy ? "Generating" : replaceExisting ? "Replace plan" : "Generate plan" }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>
