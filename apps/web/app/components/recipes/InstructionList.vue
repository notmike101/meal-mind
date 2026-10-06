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
    <header class="mb-5 flex items-end justify-between gap-4 border-b border-line pb-4">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-field text-steel">
          <CookingPot :size="20" aria-hidden="true" />
        </span>
        <div class="min-w-0">
          <h2 class="text-xl font-semibold tracking-tight">Instructions</h2>
        </div>
      </div>
      <span class="shrink-0 text-sm font-semibold tabular-nums text-muted">{{ stepCount }} steps</span>
    </header>
    <ol class="list-none space-y-4 p-0">
      <li
        v-for="step in cooklangSteps"
        :key="`${recipe.id}-step-${step.number}`"
        class="mm-step min-w-0 border-b border-line mm-py-4"
      >
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-strong text-sm font-bold tabular-nums text-strong-foreground" aria-hidden="true">
          {{ String(step.number).padStart(2, "0") }}
        </span>
        <p class="min-w-0 break-words text-base leading-relaxed text-steel">
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
        class="mm-step min-w-0 border-b border-line mm-py-4"
      >
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-strong text-sm font-bold tabular-nums text-strong-foreground" aria-hidden="true">
          {{ String(index + 1).padStart(2, "0") }}
        </span>
        <p class="min-w-0 break-words text-base leading-relaxed text-steel">{{ step }}</p>
      </li>
    </ol>
  </section>
</template>
