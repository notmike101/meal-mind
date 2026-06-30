<script setup lang="ts">
import type { MealSlotDto } from "@mealmind/contracts";
import { Check, X } from "@lucide/vue";
import { computed, ref } from "vue";
import { usePlanningStore } from "~/stores/planning";

const props = defineProps<{ slots: MealSlotDto[] }>();
const planning = usePlanningStore();
const busySlotId = ref<string | null>(null);
const plannedSlots = computed(() => props.slots.filter((slot) => slot.status === "planned"));

async function update(slotId: string, status: "done" | "skipped") {
  busySlotId.value = slotId;
  try {
    await planning.updateAdherence(slotId, status);
  } finally {
    busySlotId.value = null;
  }
}
</script>

<template>
  <section class="rounded-md bg-surface p-5 shadow-line">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm font-medium uppercase tracking-wide text-moss">Today</p>
        <h2 class="mt-1 text-xl font-semibold">Active meals</h2>
      </div>
      <span v-if="plannedSlots.length" class="rounded-md bg-tomato/10 px-3 py-1 text-sm font-medium text-tomato">
        {{ plannedSlots.length }} meal{{ plannedSlots.length === 1 ? "" : "s" }} still planned
      </span>
      <span v-else class="rounded-md bg-moss/10 px-3 py-1 text-sm font-medium text-moss">All handled</span>
    </div>
    <div class="mt-4 grid gap-3 md:grid-cols-2">
      <div v-for="slot in slots" :key="slot.id" class="rounded-md border border-ink/10 p-4">
        <p class="text-xs font-semibold uppercase text-moss">{{ slot.mealType }}</p>
        <h3 class="mt-1 font-semibold">{{ slot.recipeTitleSnapshot }}</h3>
        <p class="mt-1 text-sm text-ink/60">
          {{ slot.servings }} serving{{ slot.servings === 1 ? "" : "s" }} · {{ slot.status }}
        </p>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            :disabled="busySlotId === slot.id"
            class="focus-ring inline-flex items-center gap-2 rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white"
            @click="update(slot.id, 'done')"
          >
            <Check :size="15" aria-hidden="true" /> Done
          </button>
          <button
            type="button"
            :disabled="busySlotId === slot.id"
            class="focus-ring inline-flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-medium"
            @click="update(slot.id, 'skipped')"
          >
            <X :size="15" aria-hidden="true" /> Skipped
          </button>
        </div>
      </div>
    </div>
    <p v-if="slots.length === 0" class="mt-4 text-sm text-ink/60">No active meals for today.</p>
  </section>
</template>
