<script setup lang="ts">
import type { MealPlanDto } from "@mealmind/contracts";
import { Lock, Unlock } from "@lucide/vue";

defineProps<{ plan: MealPlanDto; locked: boolean }>();
</script>

<template>
  <div class="flex flex-col mm-gap-2 rounded-md bg-surface mm-p-4 shadow-line sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="font-semibold">{{ plan.weekStart }} through {{ plan.weekEnd }}</h2>
      <p class="mm-text-sm text-ink/60">
        {{ plan.status }} · {{ plan.creationSource === "ai" && plan.aiModel ? `generated with ${plan.aiModel}` : "created manually" }}
      </p>
    </div>
    <span class="inline-flex items-center mm-gap-2 rounded-md bg-field mm-px-3 mm-py-2 mm-text-sm font-medium">
      <Lock v-if="locked" :size="15" aria-hidden="true" />
      <Unlock v-else :size="15" aria-hidden="true" />
      {{ locked ? "Locked" : "Editable" }}
    </span>
  </div>
</template>
