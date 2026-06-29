<script setup lang="ts">
import { Minus, Plus } from "@lucide/vue";

const props = defineProps<{ servings: number; disabled: boolean }>();
const emit = defineEmits<{ update: [servings: number] }>();
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <span class="text-sm font-medium">Servings</span>
    <div class="flex h-9 items-center overflow-hidden rounded-md border border-ink/10">
      <button
        type="button"
        aria-label="Decrease servings"
        :disabled="disabled || props.servings <= 1"
        class="focus-ring flex h-9 w-9 items-center justify-center hover:bg-field"
        @click="emit('update', props.servings - 1)"
      >
        <Minus :size="15" aria-hidden="true" />
      </button>
      <span class="flex h-9 min-w-10 items-center justify-center border-x border-ink/10 text-sm font-semibold">
        {{ props.servings }}
      </span>
      <button
        type="button"
        aria-label="Increase servings"
        :disabled="disabled || props.servings >= 12"
        class="focus-ring flex h-9 w-9 items-center justify-center hover:bg-field"
        @click="emit('update', props.servings + 1)"
      >
        <Plus :size="15" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
