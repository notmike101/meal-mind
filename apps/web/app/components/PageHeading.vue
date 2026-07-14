<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <section>
    <p class="mm-text-sm font-medium uppercase tracking-wide text-moss">{{ eyebrow }}</p>
    <h1 class="mm-mt-2 mm-text-3xl font-semibold tracking-normal text-ink">{{ title }}</h1>
    <p class="mm-mt-2 mm-max-w-3xl text-ink/70">{{ description }}</p>
  </section>
</template>
