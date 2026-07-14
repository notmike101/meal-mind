<script setup lang="ts">
import type { RecipeDto } from "@mealmind/contracts";
import { CookingPot } from "@lucide/vue";
import { computed } from "vue";
import { getCooklangSteps, getInstructionSteps } from "~/utils/recipes";

const props = defineProps<{ recipe: RecipeDto }>();
const cooklangSteps = computed(() => getCooklangSteps(props.recipe));
const fallbackSteps = computed(() => cooklangSteps.value.length === 0 ? getInstructionSteps(props.recipe.instructions) : []);
const stepCount = computed(() => cooklangSteps.value.length || fallbackSteps.value.length);
</script>

<template>
  <section data-testid="recipe-instructions" class="min-w-0">
    <header class="mb-5 flex items-end justify-between gap-4 border-b border-line/20 pb-4">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tomato/10 text-tomato">
          <CookingPot :size="20" aria-hidden="true" />
        </span>
        <div class="min-w-0">
          <p class="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink/45">Step by step</p>
          <h2 class="mt-0.5 text-2xl font-semibold tracking-tight">Instructions</h2>
        </div>
      </div>
      <span class="shrink-0 text-sm font-semibold tabular-nums text-ink/45">{{ stepCount }} steps</span>
    </header>
    <ol class="list-none space-y-4 p-0">
      <li
        v-for="step in cooklangSteps"
        :key="`${recipe.id}-step-${step.number}`"
        class="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-4 rounded-2xl border border-line/20 bg-surface p-5 shadow-sm shadow-ink/[0.03] sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-5 sm:p-6"
      >
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-strong text-sm font-bold tabular-nums text-strong-foreground" aria-hidden="true">
          {{ String(step.number).padStart(2, "0") }}
        </span>
        <p class="min-w-0 break-words text-[0.98rem] leading-7 text-ink/75 sm:text-base sm:leading-8">
          <RecipesRecipeToken
            v-for="(token, index) in step.tokens"
            :key="`${recipe.id}-step-${step.number}-token-${index}`"
            :token="token"
          />
        </p>
      </li>
      <li
        v-for="(step, index) in fallbackSteps"
        :key="`${recipe.id}-fallback-${index}`"
        class="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-4 rounded-2xl border border-line/20 bg-surface p-5 shadow-sm shadow-ink/[0.03] sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-5 sm:p-6"
      >
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-strong text-sm font-bold tabular-nums text-strong-foreground" aria-hidden="true">
          {{ String(index + 1).padStart(2, "0") }}
        </span>
        <p class="min-w-0 break-words text-[0.98rem] leading-7 text-ink/75 sm:text-base sm:leading-8">{{ step }}</p>
      </li>
    </ol>
  </section>
</template>
