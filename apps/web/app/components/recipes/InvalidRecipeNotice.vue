<script setup lang="ts">
import type { InvalidRecipeDto } from "@mealmind/contracts";
import { AlertTriangle } from "@lucide/vue";

defineProps<{ invalidRecipes: InvalidRecipeDto[] }>();
</script>

<template>
  <section class="mm-status-error">
    <div class="flex items-center mm-gap-2 font-semibold text-tomato">
      <AlertTriangle :size="18" aria-hidden="true" /> Invalid recipe files
    </div>
    <div class="mm-mt-3 mm-space-y-3">
      <div v-for="invalid in invalidRecipes" :key="invalid.filePath" class="rounded-md bg-surface mm-p-3 shadow-line">
        <p class="break-words font-medium">{{ invalid.filePath }}</p>
        <ul class="mm-mt-2 list-disc mm-pl-5 mm-text-sm text-steel">
          <li v-for="error in invalid.errors" :key="error">{{ error }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>
