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
    <section class="border-b-2 border-ink pb-10">
      <PageHeading eyebrow="Shopping" title="Consolidated grocery list" description="Everything for your selected meal plan, grouped and ready to check off." />
    </section>
    <ShoppingList
      v-if="shopping.plan"
      :items="shopping.shoppingList?.items ?? []"
      :can-regenerate="canRegenerate"
    />
    <div v-else class="border-y border-dashed border-line/40 py-16 text-center text-ink/60">
      No meal plan selected.
    </div>
  </div>
</template>
