<script setup lang="ts">
import { ListChecks } from "@lucide/vue";

defineProps<{ ingredients: string[] }>();
</script>

<template>
  <section data-testid="recipe-ingredients" class="mm-panel min-w-0 self-start overflow-hidden">
    <header class="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-field text-moss">
          <ListChecks :size="20" aria-hidden="true" />
        </span>
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-tight text-muted">Prep list</p>
          <h2 class="mt-0.5 text-xl font-semibold tracking-tight">Ingredients</h2>
        </div>
      </div>
      <span class="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-field px-2 text-xs font-bold tabular-nums text-steel">
        {{ ingredients.length }}
      </span>
    </header>
    <ul class="divide-y divide-line px-5 sm:px-6">
      <li v-for="ingredient in ingredients" :key="ingredient" class="flex min-w-0 items-start gap-3 py-3.5 text-sm leading-6 text-steel ">
        <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss" aria-hidden="true" />
        <span class="min-w-0 break-words">{{ ingredient }}</span>
      </li>
    </ul>
  </section>
</template>
