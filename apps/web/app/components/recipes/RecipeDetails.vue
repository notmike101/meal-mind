<script setup lang="ts">
import type { RecipeDto } from "@mealmind/contracts";
import { computed } from "vue";

const props = withDefaults(defineProps<{
  recipe: RecipeDto;
  servings: number;
  disabled?: boolean;
  headingId?: string;
  embedded?: boolean;
}>(), {
  headingId: undefined,
  embedded: false,
  disabled: false,
});
const emit = defineEmits<{ updateServings: [servings: number] }>();

const totalTime = computed(() => (props.recipe.prepTimeMinutes ?? 0) + (props.recipe.cookTimeMinutes ?? 0));
</script>

<template>
  <div class="mm-space-y-6">
    <section :class="embedded ? 'border-b border-ink/10 pb-5' : 'rounded-md bg-surface mm-p-6 shadow-line'">
      <div class="flex flex-col mm-gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="mm-text-sm font-medium uppercase tracking-wide text-moss">Recipe</p>
          <h1 :id="headingId" class="mm-mt-2 mm-text-3xl font-semibold text-ink">{{ recipe.title }}</h1>
          <p class="mm-mt-3 mm-max-w-3xl text-ink/70">{{ recipe.description }}</p>
        </div>
        <span class="w-fit rounded-md bg-field mm-px-3 mm-py-2 mm-text-sm font-medium text-ink/70">
          {{ servings }} servings
        </span>
      </div>
      <div class="mm-mt-5 max-w-xs">
        <PlanServingsStepper :servings="servings" :disabled="disabled" @update="emit('updateServings', $event)" />
      </div>
      <div class="mm-mt-5">
        <RecipesRecipeMeta :suggested-slots="recipe.suggestedSlots" :total-time="totalTime" :tags="recipe.tags" />
      </div>
    </section>
    <div class="grid mm-gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <RecipesIngredientList :ingredients="recipe.ingredients" />
      <RecipesInstructionList :recipe="recipe" />
    </div>
  </div>
</template>
