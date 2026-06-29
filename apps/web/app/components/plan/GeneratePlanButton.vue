<script setup lang="ts">
import { RefreshCw, Sparkles } from "@lucide/vue";
import { ref } from "vue";
import { errorMessage } from "~/composables/use-api";
import { usePlanningStore } from "~/stores/planning";

const props = withDefaults(defineProps<{ replaceExisting?: boolean; label?: string }>(), {
  replaceExisting: false,
  label: undefined,
});
const planning = usePlanningStore();
const busy = ref(false);
const error = ref<string | null>(null);

async function generate() {
  error.value = null;
  if (props.replaceExisting && !window.confirm("Replace the existing draft plan for next week?")) return;
  busy.value = true;
  try {
    await planning.generate(props.replaceExisting);
  } catch (caught) {
    error.value = errorMessage(caught, "Could not generate plan.");
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="space-y-2">
    <button
      type="button"
      :disabled="busy"
      class="focus-ring inline-flex items-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white hover:bg-moss/90"
      @click="generate"
    >
      <RefreshCw v-if="busy" :size="16" class="animate-spin" aria-hidden="true" />
      <Sparkles v-else :size="16" aria-hidden="true" />
      {{ busy ? "Generating" : label ?? (replaceExisting ? "Replace draft" : "Generate next week") }}
    </button>
    <p v-if="error" class="max-w-xl text-sm text-tomato">{{ error }}</p>
  </div>
</template>
