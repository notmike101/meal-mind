<script setup lang="ts">
import type { MealPlanDto } from "@mealmind/contracts";
import { CalendarRange, Lock, Unlock } from "@lucide/vue";

defineProps<{ plan: MealPlanDto; locked: boolean }>();
</script>

<template>
  <div class="flex flex-col mm-gap-4 border-y border-line/40 bg-surface mm-p-5 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center mm-gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center border border-ink text-ink">
        <CalendarRange :size="21" aria-hidden="true" />
      </span>
      <div>
        <h2 class="mm-display mm-text-xl font-semibold">{{ plan.weekStart }} through {{ plan.weekEnd }}</h2>
        <p class="mm-mt-1 mm-text-sm text-ink/55">
          {{ plan.status }} · {{ plan.creationSource === "ai" && plan.aiModel ? `generated with ${plan.aiModel}` : "created manually" }}
        </p>
      </div>
    </div>
    <span :class="locked ? 'border-ink/30 text-ink/70' : 'border-moss text-moss'" class="inline-flex items-center mm-gap-2 self-start border-l-2 mm-px-3 mm-py-1 mm-text-sm font-bold sm:self-center">
      <Lock v-if="locked" :size="15" aria-hidden="true" />
      <Unlock v-else :size="15" aria-hidden="true" />
      {{ locked ? "Locked" : "Editable" }}
    </span>
  </div>
</template>
