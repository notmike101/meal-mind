<script setup lang="ts">
import type { MealDto, MealPlanDto } from "@mealmind/contracts";
import { CalendarMinus, CalendarPlus, Plus } from "@lucide/vue";
import { computed } from "vue";
import { formatDisplayDate, getDatesInWeek } from "~/utils/dates";

const props = defineProps<{ plan: MealPlanDto; activeMealId: string; addingDate: string | null; busy?: boolean }>();
const emit = defineEmits<{ select: [mealId: string]; add: [date: string]; toggleDay: [date: string, skipped: boolean] }>();
const dates = computed(() => getDatesInWeek(props.plan.weekStart));
function mealsForDate(date: string) {
  return props.plan.meals.filter((meal) => meal.date === date) as MealDto[];
}
function isSkipped(date: string) {
  return props.plan.skippedDates.includes(date);
}
</script>

<template>
  <nav aria-label="Planned meals" class="overflow-x-auto pb-2">
    <div class="grid min-w-[1024px] grid-cols-7 mm-gap-3">
      <section v-for="date in dates" :key="date" class="rounded-lg mm-p-2 shadow-line" :class="isSkipped(date) ? 'bg-field text-ink/55' : 'bg-surface'">
        <div class="flex items-center justify-between mm-gap-2 mm-px-2 mm-pb-2">
          <h3 class="mm-text-sm font-semibold">{{ formatDisplayDate(date) }}</h3>
          <button type="button" :disabled="busy" :aria-label="`${isSkipped(date) ? 'Restore' : 'Skip'} ${formatDisplayDate(date)}`" class="focus-ring rounded p-1 hover:bg-ink/5 disabled:opacity-50" @click="emit('toggleDay', date, !isSkipped(date))">
            <CalendarPlus v-if="isSkipped(date)" :size="16" aria-hidden="true" />
            <CalendarMinus v-else :size="16" aria-hidden="true" />
          </button>
        </div>
        <div v-if="isSkipped(date)" class="rounded-md border border-dashed border-ink/15 mm-px-3 mm-py-6 text-center mm-text-sm font-medium">Skipped</div>
        <div v-else class="mm-space-y-2">
          <button
            v-for="meal in mealsForDate(date)"
            :key="meal.id"
            type="button"
            :aria-pressed="meal.id === activeMealId"
            class="focus-ring w-full rounded-md border mm-px-3 mm-py-2 text-left transition"
            :class="meal.id === activeMealId
              ? 'border-moss bg-moss text-white'
              : 'border-ink/10 bg-field hover:border-moss/50 hover:bg-moss/5'"
            @click="emit('select', meal.id)"
          >
            <span class="block text-[11px] font-semibold uppercase tracking-wide" :class="meal.id === activeMealId ? 'text-white/75' : 'text-ink/55'">
              {{ meal.slot || "Meal" }}
            </span>
            <span class="mm-mt-1 block truncate mm-text-sm font-medium">{{ meal.recipeTitleSnapshot }}</span>
          </button>
          <button
            type="button"
            :aria-pressed="addingDate === date"
            class="focus-ring inline-flex w-full items-center justify-center mm-gap-1 rounded-md border border-dashed mm-px-3 mm-py-2 mm-text-xs font-semibold"
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
