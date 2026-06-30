<script setup lang="ts">
import type { MealPlanDto } from "@mealmind/contracts";

defineProps<{ draft: MealPlanDto | null }>();
</script>

<template>
  <div class="rounded-md bg-surface p-5 shadow-line">
    <h2 class="font-semibold">Draft status</h2>
    <p v-if="draft" class="mt-2 text-sm text-ink/65">
      {{ draft.weekStart }} plan is {{ draft.status }} with {{ draft.slots.length }} meals.
    </p>
    <p v-else class="mt-2 text-sm text-ink/65">No upcoming draft exists yet.</p>
  </div>
</template>
