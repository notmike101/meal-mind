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
  <nav aria-label="Planned meals" class="mm-scrollbar-none overflow-x-auto mm-pb-2">
    <div class="grid auto-cols-[minmax(10.5rem,1fr)] grid-flow-col mm-gap-3 xl:auto-cols-auto xl:grid-flow-row xl:grid-cols-7">
      <section v-for="date in dates" :key="date" class="snap-start rounded-2xl border border-line/20 mm-p-2 shadow-sm" :class="isSkipped(date) ? 'bg-field text-ink/60' : 'bg-surface'">
        <div class="flex items-center justify-between mm-gap-2 mm-px-2 mm-pb-2">
          <h3 class="mm-text-sm font-semibold">{{ formatDisplayDate(date) }}</h3>
          <button type="button" :disabled="busy" :aria-label="`${isSkipped(date) ? 'Restore' : 'Skip'} ${formatDisplayDate(date)}`" class="focus-ring rounded-lg p-1.5 text-ink/55 transition-colors hover:bg-field hover:text-ink disabled:opacity-50" @click="emit('toggleDay', date, !isSkipped(date))">
            <CalendarPlus v-if="isSkipped(date)" :size="16" aria-hidden="true" />
            <CalendarMinus v-else :size="16" aria-hidden="true" />
          </button>
        </div>
        <div v-if="isSkipped(date)" class="rounded-xl border border-dashed border-ink/15 mm-px-3 mm-py-6 text-center mm-text-sm font-medium">Skipped</div>
        <div v-else class="mm-space-y-2">
          <button
            v-for="meal in mealsForDate(date)"
            :key="meal.id"
            type="button"
            :aria-pressed="meal.id === activeMealId"
            class="focus-ring w-full rounded-xl border mm-px-3 mm-py-2.5 text-left transition"
            :class="meal.id === activeMealId
              ? 'border-moss bg-moss text-white shadow-md'
              : 'border-line/15 bg-field/70 hover:border-moss/40 hover:bg-moss/5'"
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
            class="focus-ring inline-flex w-full items-center justify-center mm-gap-1 rounded-xl border border-dashed mm-px-3 mm-py-2 mm-text-xs font-semibold transition-colors"
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
