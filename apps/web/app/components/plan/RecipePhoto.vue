<script setup lang="ts">
import { ChefHat } from "@lucide/vue";
import { ref, watch } from "vue";

const props = defineProps<{ imageUrl: string | null; title: string }>();
const failed = ref(false);
watch(() => props.imageUrl, () => { failed.value = false; });
</script>

<template>
  <div class="relative aspect-[4/3] overflow-hidden border border-line/25 bg-field">
    <img
      v-if="imageUrl && !failed"
      :src="imageUrl"
      :alt="`${title} plated meal`"
      class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
      loading="lazy"
      @error="failed = true"
    >
    <div v-else class="flex h-full items-center justify-center text-moss/70" role="img" :aria-label="`No photo available for ${title}`">
      <ChefHat :size="42" stroke-width="1.5" aria-hidden="true" />
    </div>
  </div>
</template>
