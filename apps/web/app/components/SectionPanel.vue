<script setup lang="ts">
import { useId } from "vue";

defineProps<{ title: string; help?: string }>();
const headingId = useId();
</script>

<template>
  <section class="mm-panel mm-section" :aria-labelledby="headingId">
    <header class="mm-section-header">
      <div class="min-w-0">
        <h2 :id="headingId" class="break-words mm-text-xl font-semibold leading-snug text-ink">{{ title }}</h2>
        <p v-if="help" class="mm-mt-2 mm-text-sm leading-relaxed text-steel">{{ help }}</p>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center mm-gap-3">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </section>
</template>
