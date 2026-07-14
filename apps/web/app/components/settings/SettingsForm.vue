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
  <div class="mm-space-y-10">
    <section class="grid gap-6 border-t-2 border-ink pt-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div>
        <p class="mm-text-xs font-bold uppercase tracking-[0.18em] text-moss">01 / Runtime</p>
        <h2 class="mm-display mm-mt-2 mm-text-2xl font-semibold">Connection & defaults</h2>
        <p class="mm-mt-2 mm-text-sm text-ink/55">Where MealMind thinks and how much it plans.</p>
      </div>
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
    </section>

    <section class="grid gap-6 border-t-2 border-ink pt-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div>
        <p class="mm-text-xs font-bold uppercase tracking-[0.18em] text-moss">02 / Brief</p>
        <h2 class="mm-display mm-mt-2 mm-text-2xl font-semibold">Planning direction</h2>
        <p class="mm-mt-2 mm-text-sm text-ink/55">Give the planner taste, variety, and household context.</p>
      </div>
      <div class="mm-space-y-4">
        <SettingsPlanningFields
          v-model:preferences="form.planningPreferences"
          v-model:variety-rules="form.planningVarietyRules"
        />
      </div>
    </section>

    <section class="grid gap-6 border-t-2 border-ink pt-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div>
        <p class="mm-text-xs font-bold uppercase tracking-[0.18em] text-moss">03 / Routine</p>
        <h2 class="mm-display mm-mt-2 mm-text-2xl font-semibold">Automation</h2>
      </div>
      <SettingsAutomationField v-model="form.autoGenerateNextWeek" />
    </section>

    <section class="grid gap-6 border-t-2 border-ink pt-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div>
        <p class="mm-text-xs font-bold uppercase tracking-[0.18em] text-moss">04 / Kitchen</p>
        <h2 class="mm-display mm-mt-2 mm-text-2xl font-semibold">Pantry staples</h2>
        <p class="mm-mt-2 mm-text-sm text-ink/55">Ingredients that should not appear on the shopping list.</p>
      </div>
      <SettingsPantryField v-model="form.pantryStaples" />
    </section>

    <div class="border-t border-line/40 pt-5">
      <SettingsFormActions :busy="busy" :can-save="canSave" @save="runSave" @test-ai="testAi" />
      <p v-if="status" class="mm-mt-3 mm-text-sm text-ink/70">{{ status }}</p>
    </div>
  </div>
</template>
