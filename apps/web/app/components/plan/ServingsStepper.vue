<script setup lang="ts">
import { Minus, Plus } from "@lucide/vue";

const props = defineProps<{ servings: number; disabled: boolean }>();
const emit = defineEmits<{ update: [servings: number] }>();
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="min-w-0">
      <span class="block text-sm font-semibold text-ink">Servings</span>
      <span class="mt-0.5 block text-xs text-muted">Scale ingredient amounts</span>
    </div>
    <div role="group" aria-label="Adjust servings" class="mm-servings-controls grid shrink-0 items-center rounded-md border border-control bg-surface">
      <button
        type="button"
        aria-label="Decrease servings"
        :disabled="disabled || props.servings <= 1"
        class="focus-ring flex min-h-control min-w-control items-center justify-center text-steel transition-colors hover:bg-field hover:text-ink disabled:cursor-not-allowed disabled:text-muted"
        @click="emit('update', props.servings - 1)"
      >
        <Minus :size="17" aria-hidden="true" />
      </button>
      <output class="flex h-11 min-w-12 items-center justify-center border-x border-line text-sm font-bold tabular-nums" aria-live="polite">
        {{ props.servings }}
      </output>
      <button
        type="button"
        aria-label="Increase servings"
        :disabled="disabled || props.servings >= 12"
        class="focus-ring flex min-h-control min-w-control items-center justify-center text-steel transition-colors hover:bg-field hover:text-ink disabled:cursor-not-allowed disabled:text-muted"
        @click="emit('update', props.servings + 1)"
      >
        <Plus :size="17" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
