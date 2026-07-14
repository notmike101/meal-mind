<script setup lang="ts">
import type { MealPlanDto } from "@mealmind/contracts";

defineProps<{ draft: MealPlanDto | null }>();
</script>

<template>
  <div class="rounded-md bg-surface mm-p-5 shadow-line">
    <h2 class="font-semibold">Draft status</h2>
    <p v-if="draft" class="mm-mt-2 mm-text-sm text-ink/65">
      {{ draft.weekStart }} plan is {{ draft.status }} with {{ draft.meals.length }} meals.
    </p>
    <p v-else class="mm-mt-2 mm-text-sm text-ink/65">No upcoming draft exists yet.</p>
  </div>
</template>
