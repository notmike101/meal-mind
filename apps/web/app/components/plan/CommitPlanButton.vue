<script setup lang="ts">
import { Lock, RefreshCw } from "@lucide/vue";
import { ref } from "vue";
import { errorMessage } from "~/composables/use-api";
import { usePlanningStore } from "~/stores/planning";

const props = defineProps<{ planId: string }>();
const planning = usePlanningStore();
const busy = ref(false);
const error = ref<string | null>(null);

async function commit() {
  busy.value = true;
  error.value = null;
  try {
    await planning.commit(props.planId);
  } catch (caught) {
    error.value = errorMessage(caught, "Could not commit plan.");
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
      class="focus-ring inline-flex items-center gap-2 rounded-md bg-strong px-4 py-2 text-sm font-semibold text-strong-foreground hover:bg-strong/90"
      @click="commit"
    >
      <RefreshCw v-if="busy" :size="16" class="animate-spin" aria-hidden="true" />
      <Lock v-else :size="16" aria-hidden="true" />
      {{ busy ? "Committing" : "Commit plan" }}
    </button>
    <p v-if="error" class="text-sm text-tomato">{{ error }}</p>
  </div>
</template>
