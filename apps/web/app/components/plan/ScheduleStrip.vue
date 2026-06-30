<script setup lang="ts">
import type { MealPlanDto, MealSlotDto } from "@mealmind/contracts";
import { computed } from "vue";
import { formatDisplayDate, getDatesInWeek } from "~/utils/dates";

const props = defineProps<{ plan: MealPlanDto; activeSlotId: string }>();
const emit = defineEmits<{ select: [slotId: string] }>();
const dates = computed(() => getDatesInWeek(props.plan.weekStart));
function slotsForDate(date: string) {
  return props.plan.slots.filter((slot) => slot.date === date) as MealSlotDto[];
}
</script>

<template>
  <nav aria-label="Meal slots" class="overflow-x-auto pb-2">
    <div class="grid min-w-[1024px] grid-cols-7 gap-3">
      <section v-for="date in dates" :key="date" class="rounded-lg bg-surface p-2 shadow-line">
        <h3 class="px-2 pb-2 text-sm font-semibold">{{ formatDisplayDate(date) }}</h3>
        <div class="space-y-2">
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
