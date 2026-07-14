<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <section class="max-w-4xl">
    <p class="inline-flex items-center mm-gap-2 mm-text-sm font-semibold text-moss">
      <span class="h-2 w-2 rounded-full bg-moss ring-4 ring-moss/10" aria-hidden="true" />
      {{ eyebrow }}
    </p>
    <h1 class="mm-mt-3 text-[clamp(2rem,4.5vw,3rem)] font-bold leading-[1.06] tracking-[-0.04em] text-ink">{{ title }}</h1>
    <p class="mm-mt-4 max-w-2xl mm-text-base leading-7 text-ink/70">{{ description }}</p>
  </section>
</template>
