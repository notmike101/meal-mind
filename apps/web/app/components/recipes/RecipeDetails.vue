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
  <div class="space-y-8 lg:space-y-10">
    <section
      class="grid overflow-hidden rounded-3xl border border-line/20 bg-surface lg:grid-cols-[minmax(18rem,0.88fr)_minmax(0,1.12fr)]"
      :class="embedded ? '' : 'shadow-xl shadow-ink/5'"
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
        <div v-else class="absolute inset-0 flex items-center justify-center bg-field text-moss/55" aria-hidden="true">
          <ChefHat :size="64" stroke-width="1.25" />
        </div>
      </div>
      <div class="flex min-w-0 flex-col justify-center p-6 sm:p-8 lg:p-10">
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-moss">From your collection</p>
        <h1 :id="headingId" class="mt-3 break-words text-[clamp(2rem,4vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-ink">
          {{ recipe.title }}
        </h1>
        <p v-if="recipe.description" class="mt-5 max-w-2xl text-base leading-7 text-ink/65 sm:text-lg sm:leading-8">
          {{ recipe.description }}
        </p>
        <div class="mt-6">
          <RecipesRecipeMeta :suggested-slots="recipe.suggestedSlots" :total-time="totalTime" :tags="recipe.tags" />
        </div>
        <div class="mt-7 max-w-sm border-t border-line/20 pt-5">
          <PlanServingsStepper :servings="servings" :disabled="disabled" @update="emit('updateServings', $event)" />
        </div>
      </div>
    </section>
    <div data-testid="recipe-body" class="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.55fr)] lg:gap-10">
      <RecipesIngredientList :ingredients="recipe.ingredients" />
      <RecipesInstructionList :recipe="recipe" />
    </div>
  </div>
</template>
