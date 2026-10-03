<script setup lang="ts">
import { computed, useId } from "vue";

const aiBaseUrl = defineModel<string>("aiBaseUrl", { required: true });
const aiModel = defineModel<string>("aiModel", { required: true });
const aiApiKey = defineModel<string | null>("aiApiKey");
const timezone = defineModel<string>("timezone", { required: true });
defineProps<{
  models: string[];
  authConfigured: boolean;
  modelsLoaded: boolean;
  endpointChanged?: boolean;
}>();
const modelsId = useId();
const modelHelpId = useId();
const keyInput = computed({
  get: () => aiApiKey.value ?? "",
  set: (value: string) => {
    aiApiKey.value = value.trim() ? value : aiApiKey.value === null ? null : undefined;
  },
});
</script>

<template>
  <label class="mm-space-y-2">
    <span class="mm-text-sm font-medium">AI base URL</span>
    <input v-model="aiBaseUrl" class="focus-ring mm-field min-h-11 w-full mm-px-3 mm-py-2 text-ink" />
  </label>
  <div class="mm-space-y-2">
    <label class="block mm-space-y-2">
      <span class="mm-text-sm font-medium">API key (optional)</span>
      <input
        v-model="keyInput"
        type="password"
        autocomplete="new-password"
        class="focus-ring mm-field min-h-11 w-full mm-px-3 mm-py-2 text-ink"
      />
    </label>
    <p aria-live="polite" class="mm-text-xs text-ink/55">
      Authentication token:
      {{ aiApiKey === null ? "not configured (removal pending)" : aiApiKey?.trim() ? "configured (replacement pending)" : authConfigured ? "configured" : "not configured (optional)" }}.
      Leave blank to keep the current key for the same endpoint.
      Keys are stored in plaintext in the local database.
    </p>
    <p v-if="endpointChanged" class="mm-text-xs text-ink/55">
      The endpoint has changed. The saved key will not be reused; enter a key for this endpoint if needed.
    </p>
    <button
      type="button"
      class="focus-ring min-h-11 rounded-lg border border-line/25 mm-px-3 mm-py-2 mm-text-sm text-ink"
      @click="aiApiKey = null"
    >
      Remove API key
    </button>
  </div>
  <div class="mm-space-y-2">
    <label class="block mm-space-y-2">
      <span class="mm-text-sm font-medium">AI model</span>
      <input
        v-model="aiModel"
        :list="modelsId"
        :aria-describedby="modelHelpId"
        class="focus-ring mm-field min-h-11 w-full mm-px-3 mm-py-2 text-ink"
      />
    </label>
    <datalist :id="modelsId">
      <option v-for="model in models" :key="model" :value="model" />
    </datalist>
    <span :id="modelHelpId" class="block mm-text-xs text-ink/55">
      Enter any model ID. {{ modelsLoaded ? "Reported models are optional suggestions." : "Load models for optional suggestions." }}
    </span>
  </div>
  <label class="mm-space-y-2">
    <span class="mm-text-sm font-medium">Timezone</span>
    <input v-model="timezone" class="focus-ring mm-field min-h-11 w-full mm-px-3 mm-py-2 text-ink" />
  </label>
</template>
