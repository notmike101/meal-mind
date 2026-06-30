<script setup lang="ts">
import type { MealPlanDto } from "@mealmind/contracts";
import { Lock, Unlock } from "@lucide/vue";

defineProps<{ plan: MealPlanDto; locked: boolean }>();
</script>

<template>
  <div class="flex flex-col gap-2 rounded-md bg-surface p-4 shadow-line sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="font-semibold">{{ plan.weekStart }} through {{ plan.weekEnd }}</h2>
      <p class="text-sm text-ink/60">{{ plan.status }} · generated with {{ plan.aiModel }}</p>
    </div>
    <span class="inline-flex items-center gap-2 rounded-md bg-field px-3 py-2 text-sm font-medium">
      <Lock v-if="locked" :size="15" aria-hidden="true" />
      <Unlock v-else :size="15" aria-hidden="true" />
      {{ locked ? "Locked" : "Editable" }}
    </span>
  </div>
</template>
