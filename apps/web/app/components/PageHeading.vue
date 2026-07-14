<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <section class="max-w-5xl">
    <p class="flex items-center mm-gap-3 mm-text-xs font-bold uppercase tracking-[0.2em] text-moss">
      <span class="h-px w-10 bg-moss" aria-hidden="true" />
      {{ eyebrow }}
    </p>
    <h1 class="mm-display mm-mt-4 text-[clamp(3rem,7vw,5.5rem)] font-semibold leading-[0.9] tracking-[-0.05em] text-ink">{{ title }}</h1>
    <p class="mm-mt-5 max-w-3xl mm-text-lg leading-relaxed text-ink/60">{{ description }}</p>
  </section>
</template>
