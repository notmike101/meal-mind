<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <section class="relative">
    <p class="inline-flex items-center mm-gap-2 rounded-full border border-moss/15 bg-moss/10 mm-px-3 mm-py-1 mm-text-xs font-bold uppercase tracking-[0.14em] text-moss">
      <span class="h-1.5 w-1.5 rounded-full bg-moss shadow-[0_0_0_4px_rgb(var(--moss)/0.10)]" aria-hidden="true" />
      {{ eyebrow }}
    </p>
    <h1 class="mm-mt-3 mm-text-3xl font-bold leading-[1.08] tracking-[-0.035em] text-ink">{{ title }}</h1>
    <p class="mm-mt-3 mm-max-w-3xl mm-text-lg leading-relaxed text-ink/60">{{ description }}</p>
  </section>
</template>
