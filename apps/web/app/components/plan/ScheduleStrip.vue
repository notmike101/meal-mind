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
  <nav aria-label="Planned meals" class="mm-space-y-4">
    <h2 class="mm-text-xl font-semibold">Weekly schedule</h2>
    <div class="mm-schedule-grid">
      <section v-for="date in dates" :key="date" class="mm-panel min-w-0 mm-p-2" :class="isSkipped(date) ? 'bg-field text-steel' : 'bg-surface'">
        <div class="flex items-center justify-between mm-gap-2 mm-px-2 mm-pb-2">
          <h3 class="mm-text-sm font-semibold">{{ formatDisplayDate(date) }}</h3>
          <button type="button" :disabled="busy" :aria-label="`${isSkipped(date) ? 'Restore' : 'Skip'} ${formatDisplayDate(date)}`" class="focus-ring mm-icon-button rounded-md text-steel transition-colors hover:bg-field hover:text-ink disabled:text-muted" @click="emit('toggleDay', date, !isSkipped(date))">
            <CalendarPlus v-if="isSkipped(date)" :size="16" aria-hidden="true" />
            <CalendarMinus v-else :size="16" aria-hidden="true" />
          </button>
        </div>
        <div v-if="isSkipped(date)" class="rounded-xl border border-dashed border-control mm-px-3 mm-py-6 text-center mm-text-sm font-medium">Skipped</div>
        <div v-else class="mm-space-y-2">
          <button
            v-for="meal in mealsForDate(date)"
            :key="meal.id"
            type="button"
            :aria-pressed="meal.id === activeMealId"
            class="focus-ring min-h-control w-full rounded-md border mm-px-3 mm-py-2.5 text-left transition-colors"
            :class="meal.id === activeMealId
              ? 'border-moss bg-moss text-strong-foreground'
              : 'border-control bg-field hover:border-moss hover:bg-surface'"
            @click="emit('select', meal.id)"
          >
            <span class="block text-xs font-semibold uppercase tracking-wide" :class="meal.id === activeMealId ? 'text-strong-foreground' : 'text-muted'">
              {{ meal.slot || "Meal" }}
            </span>
            <span class="mm-mt-1 block break-words mm-text-sm font-medium">{{ meal.recipeTitleSnapshot }}</span>
          </button>
          <button
            type="button"
            :aria-pressed="addingDate === date"
            class="focus-ring inline-flex min-h-control w-full items-center justify-center mm-gap-1 rounded-xl border border-dashed mm-px-3 mm-py-2 mm-text-xs font-semibold transition-colors"
            :class="addingDate === date ? 'border-moss bg-field text-moss' : 'border-control text-steel hover:border-moss'"
            @click="emit('add', date)"
          >
            <Plus :size="14" aria-hidden="true" /> Add meal
          </button>
        </div>
      </section>
    </div>
  </nav>
</template>
