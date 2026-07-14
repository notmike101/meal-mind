<script setup lang="ts">
const model = defineModel<boolean>({ required: true });
</script>

<template>
  <label class="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-field/50 p-4 transition-colors hover:bg-field/70 sm:p-5">
    <span class="min-w-0">
      <span class="block text-sm font-semibold text-ink">Automatically generate next week's plan</span>
      <span class="mt-1 block text-sm leading-6 text-ink/60">
        MealMind checks at startup and periodically while it is running. Existing plans are never replaced.
      </span>
      <span class="mt-2 block text-xs font-semibold" :class="model ? 'text-moss' : 'text-ink/50'">
        {{ model ? "Automation enabled" : "Manual planning" }}
      </span>
    </span>
    <span class="relative mt-0.5 shrink-0">
      <input
        v-model="model"
        type="checkbox"
        class="peer sr-only"
      />
      <span class="block h-7 w-12 rounded-full bg-ink/20 transition-colors peer-checked:bg-moss peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-moss" aria-hidden="true" />
      <span class="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" aria-hidden="true" />
    </span>
  </label>
</template>
