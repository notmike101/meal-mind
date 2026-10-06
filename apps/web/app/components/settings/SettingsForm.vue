<script setup lang="ts">
import type { PantryStapleDto, PublicSettingsDto, SettingsUpdateRequest } from "@mealmind/contracts";
import { normalizeAiBaseUrl } from "@mealmind/contracts";
import { computed, reactive, ref, watch } from "vue";
import { errorMessage } from "~/composables/use-api";
import { useSettingsStore } from "~/stores/settings";
import { parsePantryStaples } from "~/utils/settings";

const props = defineProps<{ settings: PublicSettingsDto; pantryStaples: PantryStapleDto[] }>();
const store = useSettingsStore();
const form = reactive({
  timezone: props.settings.timezone,
  aiBaseUrl: props.settings.aiBaseUrl,
  aiModel: props.settings.aiModel,
  aiApiKey: undefined as string | null | undefined,
  planningPreferences: props.settings.planningPreferences,
  planningVarietyRules: props.settings.planningVarietyRules,
  defaultMealServings: props.settings.defaultMealServings,
  defaultWeeklyMealCount: props.settings.defaultWeeklyMealCount,
  autoGenerateNextWeek: props.settings.autoGenerateNextWeek,
  pantryStaples: props.pantryStaples.map((staple) => staple.name).join("\n"),
});
const status = ref<string | null>(null);
const modelStatus = ref<string | null>(null);
const busy = ref(false);
const models = ref<string[]>([]);
const catalogUrl = ref<string | null>(null);
const savedUrl = ref(props.settings.aiBaseUrl);
const savedAuthConfigured = ref(props.settings.aiAuthConfigured);

function endpoint(value: string) {
  try {
    return normalizeAiBaseUrl(value.trim());
  } catch {
    return value.trim();
  }
}

const endpointChanged = computed(() => endpoint(savedUrl.value) !== endpoint(form.aiBaseUrl));
const authConfigured = computed(() => form.aiApiKey === null
  ? false
  : Boolean(form.aiApiKey?.trim()) || (!endpointChanged.value && savedAuthConfigured.value));
const modelsLoaded = computed(() => catalogUrl.value === endpoint(form.aiBaseUrl));
const canSave = computed(() => Boolean(form.aiBaseUrl.trim() && form.aiModel.trim()));

watch([() => endpoint(form.aiBaseUrl), () => form.aiApiKey], () => {
  catalogUrl.value = null;
  models.value = [];
  modelStatus.value = null;
}, { flush: "sync" });

function payload(): SettingsUpdateRequest {
  const { aiApiKey, pantryStaples, ...settings } = form;
  const key = aiApiKey === null ? null : aiApiKey?.trim() || undefined;
  return {
    ...settings,
    ...(key !== undefined ? { aiApiKey: key } : {}),
    pantryStaples: parsePantryStaples(pantryStaples),
  };
}

async function save(showMessage = true) {
  await store.save(payload());
  if (store.data) {
    savedUrl.value = store.data.settings.aiBaseUrl;
    savedAuthConfigured.value = store.data.settings.aiAuthConfigured;
  }
  form.aiApiKey = undefined;
  if (showMessage) status.value = "Settings saved.";
}

async function runSave() {
  if (!canSave.value) {
    status.value = "Enter an AI base URL and model.";
    return;
  }
  busy.value = true;
  status.value = null;
  try {
    await save();
  } catch (caught) {
    status.value = errorMessage(caught, "Could not save settings.");
  } finally {
    busy.value = false;
  }
}

async function testAi() {
  busy.value = true;
  modelStatus.value = "Loading models…";
  catalogUrl.value = null;
  models.value = [];
  const aiBaseUrl = form.aiBaseUrl;
  const aiApiKey = form.aiApiKey === null ? null : form.aiApiKey?.trim() || undefined;
  try {
    const response = await store.testAi(aiBaseUrl, aiApiKey);
    if (endpoint(aiBaseUrl) !== endpoint(form.aiBaseUrl) || aiApiKey !== (form.aiApiKey === null ? null : form.aiApiKey?.trim() || undefined)) return;
    models.value = response.models.map((model) => model.id);
    catalogUrl.value = endpoint(aiBaseUrl);
    const count = models.value.length;
    modelStatus.value = `AI endpoint reachable. ${count} model${count === 1 ? "" : "s"} reported. You can also enter a model ID manually.`;
  } catch (caught) {
    modelStatus.value = `${errorMessage(caught, "AI test failed.")} You can still enter a model ID manually.`;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="mm-settings-form">
    <section class="min-w-0 mm-space-y-4" aria-labelledby="provider-heading">
      <header class="border-b border-line mm-pb-4">
        <h2 id="provider-heading" class="mm-text-xl font-semibold">Provider connection</h2>
        <p class="mm-mt-2 mm-text-sm text-steel">Use an OpenAI-compatible endpoint for planning and recipe imports.</p>
      </header>
      <SettingsConnectionFields
        v-model:ai-base-url="form.aiBaseUrl"
        v-model:ai-model="form.aiModel"
        v-model:ai-api-key="form.aiApiKey"
        :models="models"
        :auth-configured="authConfigured"
        :endpoint-changed="endpointChanged"
        :models-loaded="modelsLoaded"
        :busy="busy"
        :status="modelStatus"
        @test-ai="testAi"
      />
    </section>
    <section class="min-w-0 mm-space-y-6" aria-labelledby="household-heading">
      <header class="border-b border-line mm-pb-4">
        <h2 id="household-heading" class="mm-text-xl font-semibold">Household planning</h2>
        <p class="mm-mt-2 mm-text-sm text-steel">Set portions, preferences, and what you already keep on hand.</p>
      </header>
      <div class="grid min-w-0 mm-gap-4">
        <label class="block mm-space-y-2">
          <span class="mm-text-sm font-medium">Timezone</span>
          <input v-model="form.timezone" class="focus-ring mm-field min-h-11 w-full mm-px-3 mm-py-2 text-ink" />
        </label>
        <SettingsServingFields v-model:servings="form.defaultMealServings" v-model:weekly-meal-count="form.defaultWeeklyMealCount" />
      </div>
      <div class="mm-space-y-4">
        <h3 class="mm-text-base font-semibold">Meal preferences & variety</h3>
        <SettingsPlanningFields v-model:preferences="form.planningPreferences" v-model:variety-rules="form.planningVarietyRules" />
      </div>
      <div class="mm-space-y-3">
        <h3 class="mm-text-base font-semibold">Automation</h3>
        <SettingsAutomationField v-model="form.autoGenerateNextWeek" />
      </div>
      <div class="mm-space-y-3">
        <h3 class="mm-text-base font-semibold">Pantry staples</h3>
        <p class="mm-text-sm text-steel">Keep ingredients you already stock off the shopping list.</p>
        <SettingsPantryField v-model="form.pantryStaples" />
      </div>
    </section>
    <div class="mm-settings-actions">
      <SettingsFormActions :busy="busy" :can-save="canSave" @save="runSave" />
      <p class="min-w-0 break-words mm-text-sm text-steel" role="status">{{ status ?? (busy ? "Working…" : "Save applies to provider and household settings.") }}</p>
    </div>
  </div>
</template>
