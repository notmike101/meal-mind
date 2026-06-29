<script setup lang="ts">
import type { MealPlanDto, RecipeSummaryDto } from "@mealmind/contracts";
import { formatDisplayDate, getDatesInWeek } from "~/utils/dates";

const props = defineProps<{
  plan: MealPlanDto;
  recipes: Pick<RecipeSummaryDto, "id" | "title" | "mealTypes" | "tags">[];
  locked: boolean;
}>();
const dates = getDatesInWeek(props.plan.weekStart);
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-7">
    <div v-for="date in dates" :key="date" class="space-y-3">
      <h3 class="rounded-md bg-strong px-3 py-2 text-sm font-semibold text-strong-foreground">
        {{ formatDisplayDate(date) }}
      </h3>
      <PlanMealSlotCard
        v-for="slot in plan.slots.filter((candidate) => candidate.date === date)"
        :key="slot.id"
        :plan-id="plan.id"
        :meal-slot="slot"
        :recipes="recipes"
        :locked="locked"
      />
    </div>
  </div>
</template>
