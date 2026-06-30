<script setup lang="ts">
import type { MealPlanDto, MealSlotDto } from "@mealmind/contracts";
import { CalendarMinus, CalendarPlus } from "@lucide/vue";
import { computed } from "vue";
import { formatDisplayDate, getDatesInWeek } from "~/utils/dates";

const props = defineProps<{ plan: MealPlanDto; activeSlotId: string; busy?: boolean }>();
const emit = defineEmits<{ select: [slotId: string]; toggleDay: [date: string, skipped: boolean] }>();
const dates = computed(() => getDatesInWeek(props.plan.weekStart));
function slotsForDate(date: string) {
  return props.plan.slots.filter((slot) => slot.date === date) as MealSlotDto[];
}
function isSkipped(date: string) {
  return props.plan.skippedDates.includes(date);
}
</script>

<template>
  <nav aria-label="Meal slots" class="overflow-x-auto pb-2">
    <div class="grid min-w-[1024px] grid-cols-7 gap-3">
      <section
        v-for="date in dates"
        :key="date"
        class="rounded-lg p-2 shadow-line"
        :class="isSkipped(date) ? 'bg-field text-ink/55' : 'bg-surface'"
      >
        <div class="flex items-center justify-between gap-2 px-2 pb-2">
          <h3 class="text-sm font-semibold">{{ formatDisplayDate(date) }}</h3>
          <button
            type="button"
            :disabled="busy"
            :aria-label="`${isSkipped(date) ? 'Restore' : 'Skip'} ${formatDisplayDate(date)}`"
            class="focus-ring rounded p-1 hover:bg-ink/5 disabled:opacity-50"
            @click="emit('toggleDay', date, !isSkipped(date))"
          >
            <CalendarPlus v-if="isSkipped(date)" :size="16" aria-hidden="true" />
            <CalendarMinus v-else :size="16" aria-hidden="true" />
          </button>
        </div>
        <div v-if="isSkipped(date)" class="rounded-md border border-dashed border-ink/15 px-3 py-6 text-center text-sm font-medium">
          Skipped
        </div>
        <div v-else class="space-y-2">
          <button
            v-for="slot in slotsForDate(date)"
            :key="slot.id"
            type="button"
            :aria-pressed="slot.id === activeSlotId"
            class="focus-ring w-full rounded-md border px-3 py-2 text-left transition"
            :class="slot.id === activeSlotId
              ? 'border-moss bg-moss text-white'
              : 'border-ink/10 bg-field hover:border-moss/50 hover:bg-moss/5'"
            @click="emit('select', slot.id)"
          >
            <span class="block text-[11px] font-semibold uppercase tracking-wide" :class="slot.id === activeSlotId ? 'text-white/75' : 'text-ink/55'">
              {{ slot.mealType }}
            </span>
            <span class="mt-1 block truncate text-sm font-medium">{{ slot.recipeTitleSnapshot }}</span>
          </button>
        </div>
      </section>
    </div>
  </nav>
</template>
