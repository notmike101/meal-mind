<script setup lang="ts">
import type { RecipeDto } from "@mealmind/contracts";
import { ChefHat } from "@lucide/vue";
import { computed, ref, watch } from "vue";

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
const imageFailed = ref(false);

watch(() => props.recipe.imageUrl, () => {
  imageFailed.value = false;
});
</script>

<template>
  <div class="mm-space-y-6">
    <section
      class="mm-recipe-header overflow-hidden rounded-xl border border-line bg-surface"
      :class="embedded ? '' : 'shadow-panel'"
    >
      <div class="relative aspect-[16/10] min-w-0 overflow-hidden bg-field lg:aspect-auto lg:min-h-full">
        <img
          v-if="recipe.imageUrl && !imageFailed"
          :src="recipe.imageUrl"
          alt=""
          class="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          @error="imageFailed = true"
        >
        <div v-else class="absolute inset-0 flex items-center justify-center bg-field text-muted" aria-hidden="true">
          <ChefHat :size="64" stroke-width="1.25" />
        </div>
      </div>
      <div class="flex min-w-0 flex-col justify-center mm-p-5 sm:p-6">
        <p class="text-xs font-bold uppercase tracking-tight text-moss">From your collection</p>
        <h1 :id="headingId" class="mm-page-title mm-mt-2">
          {{ recipe.title }}
        </h1>
        <p v-if="recipe.description" class="mm-mt-3 max-w-2xl break-words mm-text-base leading-relaxed text-steel">
          {{ recipe.description }}
        </p>
        <div class="mm-mt-4">
          <RecipesRecipeMeta :suggested-slots="recipe.suggestedSlots" :total-time="totalTime" :tags="recipe.tags" />
        </div>
        <div class="mm-mt-4 max-w-lg border-t border-line mm-pt-4">
          <PlanServingsStepper :servings="servings" :disabled="disabled" @update="emit('updateServings', $event)" />
        </div>
      </div>
    </section>
    <div data-testid="recipe-body" class="mm-recipe-body">
      <RecipesIngredientList :ingredients="recipe.ingredients" />
      <RecipesInstructionList :recipe="recipe" />
    </div>
  </div>
</template>
