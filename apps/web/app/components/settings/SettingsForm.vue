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
  status.value = null;
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
    status.value = `AI endpoint reachable. ${count} model${count === 1 ? "" : "s"} reported. You can also enter a model ID manually.`;
  } catch (caught) {
    status.value = `${errorMessage(caught, "AI test failed.")} You can still enter a model ID manually.`;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="mm-space-y-6">
    <SectionPanel title="Connection & defaults" help="Configure an OpenAI-compatible endpoint and your everyday planning defaults.">
      <div class="grid mm-gap-6 lg:grid-cols-2">
        <div class="grid min-w-0 content-start mm-gap-4">
          <h3 class="mm-text-sm font-semibold text-ink">AI connection</h3>
          <SettingsConnectionFields
            v-model:ai-base-url="form.aiBaseUrl"
            v-model:ai-model="form.aiModel"
            v-model:ai-api-key="form.aiApiKey"
            v-model:timezone="form.timezone"
            :models="models"
            :auth-configured="authConfigured"
            :endpoint-changed="endpointChanged"
            :models-loaded="modelsLoaded"
          />
        </div>
        <div class="min-w-0 mm-space-y-4">
          <h3 class="mm-text-sm font-semibold text-ink">Planning defaults</h3>
          <SettingsServingFields
            v-model:servings="form.defaultMealServings"
            v-model:weekly-meal-count="form.defaultWeeklyMealCount"
          />
        </div>
      </div>
    </SectionPanel>
    <SectionPanel title="Meal preferences" help="Give the planner useful context about taste, variety, and your household.">
      <div class="mm-space-y-4">
        <SettingsPlanningFields v-model:preferences="form.planningPreferences" v-model:variety-rules="form.planningVarietyRules" />
      </div>
    </SectionPanel>
    <SectionPanel title="Automation" help="Let MealMind prepare the next plan in the background.">
      <SettingsAutomationField v-model="form.autoGenerateNextWeek" />
    </SectionPanel>
    <SectionPanel title="Pantry staples" help="Keep ingredients you already stock off the shopping list.">
      <SettingsPantryField v-model="form.pantryStaples" />
    </SectionPanel>
    <div class="mm-panel mm-section">
      <SettingsFormActions :busy="busy" :can-save="canSave" @save="runSave" @test-ai="testAi" />
      <p v-if="status" aria-live="polite" class="mm-mt-4 break-words rounded-md bg-field mm-p-4 mm-text-sm text-steel">{{ status }}</p>
    </div>
  </div>
</template>
