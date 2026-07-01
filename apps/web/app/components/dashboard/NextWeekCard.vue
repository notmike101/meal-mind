<script setup lang="ts">
import { CalendarCheck } from "@lucide/vue";
import type { WeekRangeDto } from "@mealmind/contracts";

defineProps<{ week: WeekRangeDto; replaceExisting: boolean; defaultMealCount: number }>();
</script>

<template>
  <div class="rounded-md bg-surface mm-p-5 shadow-line">
    <div class="flex items-center mm-gap-2">
      <CalendarCheck :size="19" aria-hidden="true" />
      <h2 class="font-semibold">Next week</h2>
    </div>
    <p class="mm-mt-2 mm-text-sm text-ink/65">{{ week.weekStart }} through {{ week.weekEnd }}</p>
    <div class="mm-mt-4"><PlanGeneratePlanButton :replace-existing="replaceExisting" :default-meal-count="defaultMealCount" /></div>
  </div>
</template>
