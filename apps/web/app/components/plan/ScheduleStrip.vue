<script setup lang="ts">
import type { MealDto, MealPlanDto } from "@mealmind/contracts";
import { CalendarMinus, CalendarPlus, Plus } from "@lucide/vue";
import { computed } from "vue";
import { formatDisplayDate, getDatesInWeek } from "~/utils/dates";

const props = defineProps<{ plan: MealPlanDto; activeMealId: string; addingDate: string | null; selectedDate: string; busy?: boolean }>();
const emit = defineEmits<{ select: [mealId: string]; add: [date: string]; selectDate: [date: string]; toggleDay: [date: string, skipped: boolean] }>();
const dates = computed(() => getDatesInWeek(props.plan.weekStart));
function mealsForDate(date: string) {
  return props.plan.meals.filter((meal) => meal.date === date) as MealDto[];
}
function isSkipped(date: string) {
  return props.plan.skippedDates.includes(date);
}
</script>

<template>
  <section class="min-w-0 mm-space-y-4" aria-labelledby="draft-schedule-heading">
    <h2 id="draft-schedule-heading" class="mm-text-xl font-semibold">Weekly schedule</h2>
    <nav class="mm-day-selector" aria-label="Choose planning day">
      <button
        v-for="date in dates"
        :key="date"
        type="button"
        :disabled="busy"
        :aria-pressed="selectedDate === date"
        class="focus-ring min-h-control shrink-0 rounded-md border mm-px-3 mm-py-2 mm-text-sm font-semibold"
        :class="selectedDate === date ? 'border-moss bg-moss text-strong-foreground' : 'border-control bg-surface text-ink'"
        @click="emit('selectDate', date)"
      >
        {{ formatDisplayDate(date) }}{{ isSkipped(date) ? " · Skipped" : "" }}
      </button>
    </nav>
    <p class="sr-only" role="status">Selected day: {{ formatDisplayDate(selectedDate) }}</p>
    <div class="mm-schedule-grid">
      <section
        v-for="date in dates"
        :key="date"
        class="mm-schedule-day min-w-0 border-b border-line mm-py-3"
        :class="[{ 'mm-schedule-day-selected': selectedDate === date }, isSkipped(date) ? 'text-steel' : 'text-ink']"
        :data-testid="selectedDate === date ? 'selected-day' : undefined"
        :data-date="date"
      >
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
            :disabled="busy"
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
            <span class="mm-mt-1 block mm-text-xs" :class="meal.id === activeMealId ? 'text-strong-foreground' : 'text-steel'">{{ meal.servings }} serving{{ meal.servings === 1 ? "" : "s" }}</span>
          </button>
          <button
            type="button"
            :disabled="busy"
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
  </section>
</template>
