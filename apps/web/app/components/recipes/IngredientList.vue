<script setup lang="ts">
defineProps<{ ingredients: string[] }>();
</script>

<template>
  <section class="rounded-md bg-surface p-5 shadow-line">
    <h2 class="text-xl font-semibold">Ingredients</h2>
    <ul class="mt-4 list-disc space-y-2 pl-5 text-ink/75">
      <li v-for="ingredient in ingredients" :key="ingredient">{{ ingredient }}</li>
    </ul>
  </section>
</template>
