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
  <div class="space-y-6">
    <section class="rounded-2xl border border-line/25 bg-surface p-5 shadow-sm sm:p-6">
      <div class="grid gap-6 xl:grid-cols-[13rem_minmax(0,1fr)] xl:gap-8">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-moss">Runtime</p>
          <h2 class="mt-2 text-xl font-semibold tracking-tight text-ink">Connection & defaults</h2>
          <p class="mt-2 text-sm leading-6 text-ink/55">Configure an OpenAI-compatible endpoint and your everyday planning defaults.</p>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="grid content-start gap-4 rounded-xl bg-field/50 p-4 sm:p-5">
            <h3 class="text-sm font-semibold text-ink">AI connection</h3>
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
          <div class="content-start rounded-xl bg-field/50 p-4 sm:p-5">
            <h3 class="mb-4 text-sm font-semibold text-ink">Planning defaults</h3>
            <SettingsServingFields
              v-model:servings="form.defaultMealServings"
              v-model:weekly-meal-count="form.defaultWeeklyMealCount"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-line/25 bg-surface p-5 shadow-sm sm:p-6">
      <div class="grid gap-6 xl:grid-cols-[13rem_minmax(0,1fr)] xl:gap-8">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-moss">Planning</p>
          <h2 class="mt-2 text-xl font-semibold tracking-tight text-ink">Meal preferences</h2>
          <p class="mt-2 text-sm leading-6 text-ink/55">Give the planner useful context about taste, variety, and your household.</p>
        </div>
        <div class="space-y-4 rounded-xl bg-field/50 p-4 sm:p-5">
          <SettingsPlanningFields
            v-model:preferences="form.planningPreferences"
            v-model:variety-rules="form.planningVarietyRules"
          />
        </div>
      </div>
    </section>

    <section class="rounded-2xl border border-line/25 bg-surface p-5 shadow-sm sm:p-6">
      <div class="grid gap-6 xl:grid-cols-[13rem_minmax(0,1fr)] xl:gap-8">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-moss">Workflow</p>
          <h2 class="mt-2 text-xl font-semibold tracking-tight text-ink">Automation</h2>
          <p class="mt-2 text-sm leading-6 text-ink/55">Let MealMind prepare the next plan in the background.</p>
        </div>
        <SettingsAutomationField v-model="form.autoGenerateNextWeek" />
      </div>
    </section>

    <section class="rounded-2xl border border-line/25 bg-surface p-5 shadow-sm sm:p-6">
      <div class="grid gap-6 xl:grid-cols-[13rem_minmax(0,1fr)] xl:gap-8">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-moss">Kitchen</p>
          <h2 class="mt-2 text-xl font-semibold tracking-tight text-ink">Pantry staples</h2>
          <p class="mt-2 text-sm leading-6 text-ink/55">Keep ingredients you already stock off the shopping list.</p>
        </div>
        <div class="rounded-xl bg-field/50 p-4 sm:p-5">
          <SettingsPantryField v-model="form.pantryStaples" />
        </div>
      </div>
    </section>

    <div class="rounded-2xl border border-line/25 bg-surface p-5 shadow-sm sm:p-6">
      <SettingsFormActions :busy="busy" :can-save="canSave" @save="runSave" @test-ai="testAi" />
      <p v-if="status" aria-live="polite" class="mt-4 rounded-xl bg-field px-4 py-3 text-sm text-ink/70">{{ status }}</p>
    </div>
  </div>
</template>
