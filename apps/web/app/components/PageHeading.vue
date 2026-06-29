<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <section>
    <p class="text-sm font-medium uppercase tracking-wide text-moss">{{ eyebrow }}</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-normal text-ink">{{ title }}</h1>
    <p class="mt-2 max-w-3xl text-ink/70">{{ description }}</p>
  </section>
</template>
