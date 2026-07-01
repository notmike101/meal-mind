<script setup lang="ts">
import type { RecipeDto } from "@mealmind/contracts";
import { computed } from "vue";
import { getCooklangSteps, getInstructionSteps } from "~/utils/recipes";

const props = defineProps<{ recipe: RecipeDto }>();
const cooklangSteps = computed(() => getCooklangSteps(props.recipe));
const fallbackSteps = computed(() => cooklangSteps.value.length === 0 ? getInstructionSteps(props.recipe.instructions) : []);
</script>

<template>
  <section class="rounded-md bg-surface mm-p-5 shadow-line">
    <h2 class="mm-text-xl font-semibold">Instructions</h2>
    <ol class="mm-mt-4 list-decimal mm-space-y-3 mm-pl-5 text-ink/75">
      <li v-for="step in cooklangSteps" :key="`${recipe.id}-step-${step.number}`">
        <RecipesRecipeToken
          v-for="(token, index) in step.tokens"
          :key="`${recipe.id}-step-${step.number}-token-${index}`"
          :token="token"
        />
      </li>
      <li v-for="(step, index) in fallbackSteps" :key="`${recipe.id}-fallback-${index}`">{{ step }}</li>
    </ol>
  </section>
</template>
