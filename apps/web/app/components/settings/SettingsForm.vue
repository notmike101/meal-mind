<script setup lang="ts">
import type { PantryStapleDto, PublicSettingsDto, SettingsUpdateRequest } from "@mealmind/contracts";
import { computed, reactive, ref } from "vue";
import { errorMessage } from "~/composables/use-api";
import { useSettingsStore } from "~/stores/settings";
import { parsePantryStaples } from "~/utils/settings";

const props = defineProps<{ settings: PublicSettingsDto; pantryStaples: PantryStapleDto[] }>();
const store = useSettingsStore();
const form = reactive({
  timezone: props.settings.timezone,
  aiBaseUrl: props.settings.aiBaseUrl,
  aiModel: props.settings.aiModel,
  planningPreferences: props.settings.planningPreferences,
  planningVarietyRules: props.settings.planningVarietyRules,
  defaultMealServings: props.settings.defaultMealServings,
  defaultWeeklyMealCount: props.settings.defaultWeeklyMealCount,
  autoGenerateNextWeek: props.settings.autoGenerateNextWeek,
  pantryStaples: props.pantryStaples.map((staple) => staple.name).join("\n"),
});
const status = ref<string | null>(null);
const busy = ref(false);
const models = ref<string[]>([props.settings.aiModel]);
const catalogUrl = ref<string | null>(null);

const modelsLoaded = computed(() => catalogUrl.value === form.aiBaseUrl);
const canSave = computed(() => {
  if (!form.aiBaseUrl.trim() || !form.aiModel.trim()) return false;
  return !modelsLoaded.value || models.value.includes(form.aiModel);
});

function payload(): SettingsUpdateRequest {
  return {
    ...form,
    pantryStaples: parsePantryStaples(form.pantryStaples),
  };
}

async function save(showMessage = true) {
  await store.save(payload());
  if (showMessage) status.value = "Settings saved.";
}

async function runSave() {
  if (!canSave.value) {
    status.value = "Enter an AI base URL and model, or select a model reported by the endpoint.";
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
  try {
    const response = await store.testAi(form.aiBaseUrl);
    models.value = response.models.map((model) => model.id);
    catalogUrl.value = form.aiBaseUrl;
    const currentModelAvailable = models.value.includes(form.aiModel);
    if (!currentModelAvailable) form.aiModel = "";
    const count = models.value.length;
    status.value = currentModelAvailable
      ? `AI endpoint reachable. ${count} model${count === 1 ? "" : "s"} reported.`
      : `AI endpoint reachable, but the configured model was not reported. Select an available model.`;
  } catch (caught) {
    status.value = errorMessage(caught, "AI test failed.");
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="mm-panel mm-space-y-6 mm-p-5 sm:p-6">
    <div class="grid mm-gap-4 md:grid-cols-2">
      <SettingsConnectionFields
        v-model:ai-base-url="form.aiBaseUrl"
        v-model:ai-model="form.aiModel"
        v-model:timezone="form.timezone"
        :models="models"
        :auth-configured="props.settings.aiAuthConfigured"
        :models-loaded="modelsLoaded"
      />
      <SettingsServingFields
        v-model:servings="form.defaultMealServings"
        v-model:weekly-meal-count="form.defaultWeeklyMealCount"
      />
    </div>
    <SettingsPlanningFields
      v-model:preferences="form.planningPreferences"
      v-model:variety-rules="form.planningVarietyRules"
    />
    <SettingsAutomationField v-model="form.autoGenerateNextWeek" />
    <SettingsPantryField v-model="form.pantryStaples" />
    <SettingsFormActions :busy="busy" :can-save="canSave" @save="runSave" @test-ai="testAi" />
    <p v-if="status" class="mm-text-sm text-ink/70">{{ status }}</p>
  </div>
</template>
