<script setup lang="ts">
import type { RecipeSummaryDto } from "@mealmind/contracts";
import { RefreshCw, Shuffle } from "@lucide/vue";

defineProps<{
  recipes: Pick<RecipeSummaryDto, "id" | "title">[];
  selectedRecipeId: string;
  currentRecipeId: string;
  disabled: boolean;
  busy: boolean;
}>();
const emit = defineEmits<{
  "update:selectedRecipeId": [recipeId: string];
  swap: [mode: "manual" | "ai"];
}>();
</script>

<template>
  <div class="space-y-2">
    <select
      :value="selectedRecipeId"
      :disabled="disabled || busy"
      class="focus-ring w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm text-ink"
      @change="emit('update:selectedRecipeId', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="recipe in recipes" :key="recipe.id" :value="recipe.id">{{ recipe.title }}</option>
    </select>
    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        :disabled="disabled || busy || selectedRecipeId === currentRecipeId"
        class="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-medium hover:bg-field"
        @click="emit('swap', 'manual')"
      >
        <Shuffle :size="15" aria-hidden="true" /> Swap
      </button>
      <button
        type="button"
        :disabled="disabled || busy"
        class="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-medium hover:bg-field"
        @click="emit('swap', 'ai')"
      >
        <RefreshCw :size="15" :class="busy ? 'animate-spin' : ''" aria-hidden="true" /> AI
      </button>
    </div>
  </div>
</template>
