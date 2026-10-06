<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <section class="min-w-0 max-w-4xl">
    <p class="mm-text-xs font-semibold uppercase tracking-wide text-steel">{{ eyebrow }}</p>
    <h1 class="mm-page-title mm-mt-2">{{ title }}</h1>
    <p class="mm-mt-2 max-w-2xl mm-text-sm leading-relaxed text-steel">{{ description }}</p>
  </section>
</template>
