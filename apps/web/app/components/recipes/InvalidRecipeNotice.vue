<script setup lang="ts">
import type { InvalidRecipeDto } from "@mealmind/contracts";
import { AlertTriangle } from "@lucide/vue";

defineProps<{ invalidRecipes: InvalidRecipeDto[] }>();
</script>

<template>
  <section class="rounded-md border border-tomato/30 bg-tomato/5 p-4">
    <div class="flex items-center gap-2 font-semibold text-tomato">
      <AlertTriangle :size="18" aria-hidden="true" /> Invalid recipe files
    </div>
    <div class="mt-3 space-y-3">
      <div v-for="invalid in invalidRecipes" :key="invalid.filePath" class="rounded-md bg-surface p-3 shadow-line">
        <p class="font-medium">{{ invalid.filePath }}</p>
        <ul class="mt-2 list-disc pl-5 text-sm text-ink/70">
          <li v-for="error in invalid.errors" :key="error">{{ error }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>
