<script setup lang="ts">
import { ListChecks } from "@lucide/vue";

defineProps<{ ingredients: string[] }>();
</script>

<template>
  <section data-testid="recipe-ingredients" class="min-w-0 self-start overflow-hidden rounded-2xl border border-line/20 bg-surface shadow-sm shadow-ink/5">
    <header class="flex items-center justify-between gap-4 border-b border-line/20 px-5 py-5 sm:px-6">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moss/10 text-moss">
          <ListChecks :size="20" aria-hidden="true" />
        </span>
        <div class="min-w-0">
          <p class="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-ink/45">Prep list</p>
          <h2 class="mt-0.5 text-xl font-semibold tracking-tight">Ingredients</h2>
        </div>
      </div>
      <span class="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-field px-2 text-xs font-bold tabular-nums text-ink/60">
        {{ ingredients.length }}
      </span>
    </header>
    <ul class="divide-y divide-line/20 px-5 sm:px-6">
      <li v-for="ingredient in ingredients" :key="ingredient" class="flex min-w-0 items-start gap-3 py-3.5 text-sm leading-6 text-ink/70 sm:text-[0.95rem]">
        <span class="mt-[0.62rem] h-1.5 w-1.5 shrink-0 rounded-full bg-moss" aria-hidden="true" />
        <span class="min-w-0 break-words">{{ ingredient }}</span>
      </li>
    </ul>
  </section>
</template>
