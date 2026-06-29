<script setup lang="ts">
import type { RecipeDto } from "@mealmind/contracts";
import { computed } from "vue";
import { getCooklangSteps, getInstructionSteps } from "~/utils/recipes";

const props = defineProps<{ recipe: RecipeDto }>();
const cooklangSteps = computed(() => getCooklangSteps(props.recipe));
const fallbackSteps = computed(() => cooklangSteps.value.length === 0 ? getInstructionSteps(props.recipe.instructions) : []);
</script>

<template>
  <section class="rounded-md bg-surface p-5 shadow-line">
    <h2 class="text-xl font-semibold">Instructions</h2>
    <ol class="mt-4 list-decimal space-y-3 pl-5 text-ink/75">
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
