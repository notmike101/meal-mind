<script setup lang="ts">
import { callOnce } from "#app";
import { computed } from "vue";
import { useShoppingStore } from "~/stores/shopping";
import { isPlanLocked } from "~/utils/plans";

const shopping = useShoppingStore();
await callOnce("shopping-current", () => shopping.fetchCurrent(), { mode: "navigation" });
const canRegenerate = computed(() => shopping.plan ? !isPlanLocked(shopping.plan) : false);
</script>

<template>
  <div class="space-y-8">
    <section>
      <PageHeading eyebrow="Shopping" title="Consolidated grocery list" description="Everything for your selected meal plan, grouped and ready to check off." />
    </section>
    <ShoppingList
      v-if="shopping.plan"
      :items="shopping.shoppingList?.items ?? []"
      :can-regenerate="canRegenerate"
    />
    <div v-else class="rounded-2xl border border-dashed border-line/35 bg-surface px-6 py-16 text-center text-ink/60">
      <p class="font-medium text-ink">No meal plan selected</p>
      <p class="mt-1 text-sm">Choose or generate a plan before building your grocery list.</p>
    </div>
  </div>
</template>
