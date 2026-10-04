<script setup lang="ts">
import type { MealPlanDto } from "@mealmind/contracts";
import { CalendarRange, Lock, Unlock } from "@lucide/vue";

defineProps<{ plan: MealPlanDto; locked: boolean }>();
</script>

<template>
  <div class="mm-panel flex flex-col mm-gap-4 mm-p-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex min-w-0 items-center mm-gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-field text-moss">
        <CalendarRange :size="21" aria-hidden="true" />
      </span>
      <div class="min-w-0">
        <h2 class="break-words mm-text-base font-semibold">{{ plan.weekStart }} through {{ plan.weekEnd }}</h2>
        <p class="mm-mt-1 break-words mm-text-sm text-steel">
          {{ plan.status }} · {{ plan.creationSource === "ai" && plan.aiModel ? `generated with ${plan.aiModel}` : "created manually" }}
        </p>
      </div>
    </div>
    <span :class="locked ? 'bg-field text-steel' : 'bg-field text-success'" class="inline-flex items-center mm-gap-2 self-start rounded-full mm-px-3 mm-py-2 mm-text-sm font-bold sm:self-center">
      <Lock v-if="locked" :size="15" aria-hidden="true" />
      <Unlock v-else :size="15" aria-hidden="true" />
      {{ locked ? "Locked" : "Editable" }}
    </span>
  </div>
</template>
