<script setup lang="ts">
import { Plus } from "@lucide/vue";
import { ref } from "vue";
import { errorMessage } from "~/composables/use-api";
import { usePlanningStore } from "~/stores/planning";

const planning = usePlanningStore();
const busy = ref(false);
const error = ref<string | null>(null);

async function createBlank() {
  busy.value = true;
  error.value = null;
  try {
    await planning.createBlank();
  } catch (caught) {
    error.value = errorMessage(caught, "Could not create a blank plan.");
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="mm-space-y-2">
    <button type="button" :disabled="busy" class="focus-ring inline-flex items-center mm-gap-2 rounded-md border border-ink/15 mm-px-4 mm-py-2 mm-text-sm font-semibold hover:bg-field" @click="createBlank">
      <Plus :size="16" aria-hidden="true" /> {{ busy ? "Creating" : "Start blank plan" }}
    </button>
    <p v-if="error" role="alert" class="mm-text-sm text-tomato">{{ error }}</p>
  </div>
</template>
