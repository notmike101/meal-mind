<script setup lang="ts">
import type { RecipeImportJobDto, RecipeImportJobStatus } from "@mealmind/contracts";
import { AlertCircle, CheckCircle2, Download, LoaderCircle } from "@lucide/vue";
import { computed, ref } from "vue";

const props = withDefaults(defineProps<{
  busy?: boolean;
  job: RecipeImportJobDto | null;
  recentJobs?: RecipeImportJobDto[];
  requestError?: string | null;
}>(), {
  busy: false,
  recentJobs: () => [],
  requestError: null,
});

const emit = defineEmits<{
  submit: [url: string];
  viewRecipe: [event: globalThis.MouseEvent, recipeId: string];
}>();

const url = ref("");
const statusLabels: Record<RecipeImportJobStatus, string> = {
  queued: "Queued",
  fetching: "Fetching page",
  converting: "Converting to CookLang",
  saving: "Saving recipe",
  succeeded: "Imported",
  failed: "Import failed",
};

const statusMessage = computed(() => {
  if (!props.job) return "Paste a public recipe page URL to add it to your CookLang library.";
  if (props.job.status === "succeeded") {
    return props.job.deduplicated ? "This recipe is already in your library." : "Recipe imported and ready to plan.";
  }
  if (props.job.status === "failed") return props.job.error || "The recipe could not be imported.";
  return statusLabels[props.job.status];
});

function submit() {
  const value = url.value.trim();
  if (!value || props.busy) return;
  emit("submit", value);
}

function viewRecipe(event: globalThis.MouseEvent, recipeId: string) {
  emit("viewRecipe", event, recipeId);
}
</script>

<template>
  <section class="mm-panel min-w-0 mm-section" aria-labelledby="recipe-import-heading">
    <div class="flex items-start gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-field text-moss">
        <Download :size="21" aria-hidden="true" />
      </span>
      <div class="min-w-0">
        <p class="text-xs font-bold uppercase tracking-tight text-moss">CookLang importer</p>
        <h2 id="recipe-import-heading" class="mt-1 text-xl font-semibold tracking-tight text-ink">Import recipe</h2>
        <p class="mt-2 text-sm leading-6 text-steel">Add a public recipe page. MealMind will validate and save the CookLang document for planning.</p>
      </div>
    </div>

    <form class="mt-5 space-y-3" @submit.prevent="submit">
      <label for="recipe-import-url" class="block text-sm font-semibold text-ink">Recipe URL</label>
      <div class="flex flex-col gap-2 sm:flex-row">
        <input
          id="recipe-import-url"
          v-model="url"
          type="url"
          inputmode="url"
          autocomplete="url"
          required
          maxlength="2048"
          class="focus-ring mm-field min-h-11 min-w-0 flex-1 px-3.5 py-2.5 text-sm text-ink"
          placeholder="https://example.com/recipe"
          :disabled="busy"
        >
        <button
          type="submit"
          class="focus-ring mm-button-primary inline-flex shrink-0 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
          :disabled="busy || !url.trim()"
        >
          <LoaderCircle v-if="busy" :size="17" class="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <Download v-else :size="17" aria-hidden="true" />
          {{ busy ? "Importing…" : "Import" }}
        </button>
      </div>
      <p id="recipe-import-help" class="text-xs leading-5 text-muted">HTTP(S) pages only. Authenticated or JavaScript-only pages may not import.</p>
    </form>

    <div v-if="requestError" class="mm-status-error mm-mt-4 flex items-start gap-2" role="alert">
      <AlertCircle :size="17" class="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{{ requestError }}</span>
    </div>

    <div v-if="job" class="mt-4 rounded-xl border border-line bg-field p-3" aria-live="polite" role="status">
      <div class="flex items-start gap-2">
        <CheckCircle2 v-if="job.status === 'succeeded'" :size="18" class="mt-0.5 shrink-0 text-success" aria-hidden="true" />
        <AlertCircle v-else-if="job.status === 'failed'" :size="18" class="mt-0.5 shrink-0 text-tomato" aria-hidden="true" />
        <LoaderCircle v-else :size="18" class="mt-0.5 shrink-0 animate-spin text-moss motion-reduce:animate-none" aria-hidden="true" />
        <div class="min-w-0">
          <p class="font-semibold text-ink">{{ statusLabels[job.status] }}</p>
          <p class="mt-1 break-words text-sm leading-5 text-steel">{{ statusMessage }}</p>
          <a
            v-if="job.status === 'succeeded' && job.recipeId"
            :href="`/recipes/${encodeURIComponent(job.recipeId)}`"
            class="focus-ring mt-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-moss underline decoration-moss underline-offset-4 hover:text-accent-hover"
            @click.exact.left.prevent="viewRecipe($event, job.recipeId)"
          >
            View recipe
          </a>
        </div>
      </div>
    </div>

    <div v-if="recentJobs.length" class="mt-5 border-t border-line pt-4">
      <p class="text-xs font-bold uppercase tracking-tight text-muted">Recent imports</p>
      <ul class="mt-2 space-y-2">
        <li v-for="recentJob in recentJobs.slice(0, 5)" :key="recentJob.id" class="flex min-w-0 flex-wrap items-center justify-between gap-3 text-sm">
          <span class="min-w-0 flex-1 break-words text-steel" :title="recentJob.sourceUrl">{{ recentJob.recipeTitle || recentJob.sourceUrl }}</span>
          <span class="text-xs font-semibold" :class="recentJob.status === 'failed' ? 'text-tomato' : recentJob.status === 'succeeded' ? 'text-success' : 'text-muted'">
            {{ statusLabels[recentJob.status] }}
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>
