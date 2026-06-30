<script setup lang="ts">
import { ChefHat } from "@lucide/vue";
import { ref, watch } from "vue";

const props = defineProps<{ imageUrl: string | null; title: string }>();
const failed = ref(false);
watch(() => props.imageUrl, () => { failed.value = false; });
</script>

<template>
  <div class="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-moss/20 via-field to-steel/15">
    <img
      v-if="imageUrl && !failed"
      :src="imageUrl"
      :alt="`${title} plated meal`"
      class="h-full w-full object-cover"
      loading="lazy"
      @error="failed = true"
    >
    <div v-else class="flex h-full items-center justify-center text-moss/70" role="img" :aria-label="`No photo available for ${title}`">
      <ChefHat :size="42" stroke-width="1.5" aria-hidden="true" />
    </div>
  </div>
</template>
