<script setup lang="ts">
import { CalendarCheck } from "@lucide/vue";
import type { WeekRangeDto } from "@mealmind/contracts";

defineProps<{ week: WeekRangeDto; replaceExisting: boolean }>();
</script>

<template>
  <div class="rounded-md bg-surface p-5 shadow-line">
    <div class="flex items-center gap-2">
      <CalendarCheck :size="19" aria-hidden="true" />
      <h2 class="font-semibold">Next week</h2>
    </div>
    <p class="mt-2 text-sm text-ink/65">{{ week.weekStart }} through {{ week.weekEnd }}</p>
    <div class="mt-4"><PlanGeneratePlanButton :replace-existing="replaceExisting" /></div>
  </div>
</template>
