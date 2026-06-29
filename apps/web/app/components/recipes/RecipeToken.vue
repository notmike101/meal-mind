<script setup lang="ts">
import type { CooklangTokenDto } from "@mealmind/contracts";
import { computed } from "vue";

const props = defineProps<{ token: CooklangTokenDto }>();
const className = computed(() => {
  if (props.token.type === "ingredient") return "font-medium text-moss";
  if (props.token.type === "cookware") return "font-medium text-ink";
  return "font-medium text-tomato";
});
</script>

<template>
  <template v-if="token.type === 'text'">{{ token.text }}</template>
  <span v-else :class="className">{{ token.text }}</span>
</template>
