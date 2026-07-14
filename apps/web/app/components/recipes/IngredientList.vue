<script setup lang="ts">
defineProps<{ ingredients: string[] }>();
</script>

<template>
  <section class="rounded-md bg-surface mm-p-5 shadow-line">
    <h2 class="mm-text-xl font-semibold">Ingredients</h2>
    <ul class="mm-mt-4 list-disc mm-space-y-2 mm-pl-5 text-ink/75">
      <li v-for="ingredient in ingredients" :key="ingredient">{{ ingredient }}</li>
    </ul>
  </section>
</template>
