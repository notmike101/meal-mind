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
  <div class="mm-space-y-6">
    <PageHeading eyebrow="Shopping" title="Consolidated grocery list" description="Groceries for the selected meal plan." />
    <ShoppingList
      v-if="shopping.plan"
      :items="shopping.shoppingList?.items ?? []"
      :can-regenerate="canRegenerate"
    />
    <div v-else class="rounded-md border border-dashed border-ink/20 bg-surface mm-p-6 text-ink/70">
      No meal plan selected.
    </div>
  </div>
</template>
