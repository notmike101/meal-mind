<script setup lang="ts">
import { Minus, Plus } from "@lucide/vue";

const props = defineProps<{ servings: number; disabled: boolean }>();
const emit = defineEmits<{ update: [servings: number] }>();
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <div class="min-w-0">
      <span class="block text-sm font-semibold text-ink">Servings</span>
      <span class="mt-0.5 block text-xs text-ink/50">Scale ingredient amounts</span>
    </div>
    <div role="group" aria-label="Adjust servings" class="grid shrink-0 grid-cols-[2.75rem_3rem_2.75rem] items-center overflow-hidden rounded-xl border border-line/25 bg-surface shadow-sm shadow-ink/5">
      <button
        type="button"
        aria-label="Decrease servings"
        :disabled="disabled || props.servings <= 1"
        class="focus-ring flex h-11 w-11 items-center justify-center text-ink/65 transition hover:bg-field hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        @click="emit('update', props.servings - 1)"
      >
        <Minus :size="17" aria-hidden="true" />
      </button>
      <output class="flex h-11 min-w-12 items-center justify-center border-x border-line/20 text-sm font-bold tabular-nums" aria-live="polite">
        {{ props.servings }}
      </output>
      <button
        type="button"
        aria-label="Increase servings"
        :disabled="disabled || props.servings >= 12"
        class="focus-ring flex h-11 w-11 items-center justify-center text-ink/65 transition hover:bg-field hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        @click="emit('update', props.servings + 1)"
      >
        <Plus :size="17" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
