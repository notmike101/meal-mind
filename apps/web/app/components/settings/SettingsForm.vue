<script setup lang="ts">
import type { PantryStapleDto, SettingsDto, SettingsUpdateRequest } from "@mealmind/contracts";
import { reactive, ref } from "vue";
import { errorMessage } from "~/composables/use-api";
import { useSettingsStore } from "~/stores/settings";
import { parsePantryStaples } from "~/utils/settings";

const props = defineProps<{ settings: SettingsDto; pantryStaples: PantryStapleDto[] }>();
const store = useSettingsStore();
const form = reactive({
  timezone: props.settings.timezone,
  aiBaseUrl: props.settings.aiBaseUrl,
  aiModel: props.settings.aiModel,
  planningPreferences: props.settings.planningPreferences,
  planningVarietyRules: props.settings.planningVarietyRules,
  defaultLunchServings: props.settings.defaultLunchServings,
  defaultDinnerServings: props.settings.defaultDinnerServings,
  autoGenerateNextWeek: props.settings.autoGenerateNextWeek,
  pantryStaples: props.pantryStaples.map((staple) => staple.name).join("\n"),
});
const status = ref<string | null>(null);
const busy = ref(false);

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
  try {
    await save(false);
    const response = await store.testAi();
    const count = Array.isArray(response.data) ? response.data.length : 0;
    status.value = `AI endpoint reachable. ${count} model${count === 1 ? "" : "s"} reported.`;
  } catch (caught) {
    status.value = errorMessage(caught, "AI test failed.");
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="space-y-5 rounded-md bg-surface p-5 shadow-line">
    <div class="grid gap-4 md:grid-cols-2">
      <SettingsConnectionFields
        v-model:ai-base-url="form.aiBaseUrl"
        v-model:ai-model="form.aiModel"
        v-model:timezone="form.timezone"
      />
      <SettingsServingFields
        v-model:lunch="form.defaultLunchServings"
        v-model:dinner="form.defaultDinnerServings"
      />
    </div>
    <SettingsPlanningFields
      v-model:preferences="form.planningPreferences"
      v-model:variety-rules="form.planningVarietyRules"
    />
    <SettingsAutomationField v-model="form.autoGenerateNextWeek" />
    <SettingsPantryField v-model="form.pantryStaples" />
    <SettingsFormActions :busy="busy" @save="runSave" @test-ai="testAi" />
    <p v-if="status" class="text-sm text-ink/70">{{ status }}</p>
  </div>
</template>
