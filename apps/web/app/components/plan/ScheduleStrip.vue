<script setup lang="ts">
import type { MealDto, MealPlanDto } from "@mealmind/contracts";
import { Plus } from "@lucide/vue";
import { computed } from "vue";
import { formatDisplayDate, getDatesInWeek } from "~/utils/dates";

const props = defineProps<{ plan: MealPlanDto; activeMealId: string; addingDate: string | null }>();
const emit = defineEmits<{ select: [mealId: string]; add: [date: string] }>();
const dates = computed(() => getDatesInWeek(props.plan.weekStart));
function mealsForDate(date: string) {
  return props.plan.meals.filter((meal) => meal.date === date) as MealDto[];
}
</script>

<template>
  <nav aria-label="Planned meals" class="overflow-x-auto pb-2">
    <div class="grid min-w-[1024px] grid-cols-7 gap-3">
      <section v-for="date in dates" :key="date" class="rounded-lg bg-surface p-2 shadow-line">
        <h3 class="px-2 pb-2 text-sm font-semibold">{{ formatDisplayDate(date) }}</h3>
        <div class="space-y-2">
          <button
            v-for="meal in mealsForDate(date)"
            :key="meal.id"
            type="button"
            :aria-pressed="meal.id === activeMealId"
            class="focus-ring w-full rounded-md border px-3 py-2 text-left transition"
            :class="meal.id === activeMealId
              ? 'border-moss bg-moss text-white'
              : 'border-ink/10 bg-field hover:border-moss/50 hover:bg-moss/5'"
            @click="emit('select', meal.id)"
          >
            <span class="block text-[11px] font-semibold uppercase tracking-wide" :class="meal.id === activeMealId ? 'text-white/75' : 'text-ink/55'">
              {{ meal.slot || "Meal" }}
            </span>
            <span class="mt-1 block truncate text-sm font-medium">{{ meal.recipeTitleSnapshot }}</span>
          </button>
          <button
            type="button"
            :aria-pressed="addingDate === date"
            class="focus-ring inline-flex w-full items-center justify-center gap-1 rounded-md border border-dashed px-3 py-2 text-xs font-semibold"
            :class="addingDate === date ? 'border-moss bg-moss/10 text-moss' : 'border-ink/20 text-ink/60 hover:border-moss/50'"
            @click="emit('add', date)"
          >
            <Plus :size="14" aria-hidden="true" /> Add meal
          </button>
        </div>
      </section>
    </div>
  </nav>
</template>
