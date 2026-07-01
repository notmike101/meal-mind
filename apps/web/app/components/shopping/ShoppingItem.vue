<script setup lang="ts">
import type { ShoppingItemDto } from "@mealmind/contracts";

defineProps<{ item: ShoppingItemDto; busy: boolean }>();
const emit = defineEmits<{ update: [itemId: string, checked: boolean] }>();

function sourceCount(item: ShoppingItemDto) {
  return (JSON.parse(item.sourceRecipeIds) as string[]).length;
}
</script>

<template>
  <label class="flex cursor-pointer mm-gap-3 mm-py-3">
    <input
      type="checkbox"
      :checked="item.checked"
      :disabled="busy"
      class="mm-mt-1 h-4 w-4"
      @change="emit('update', item.id, ($event.target as HTMLInputElement).checked)"
    />
    <span :class="item.checked ? 'text-ink/45 line-through' : ''">
      <span class="block font-medium">{{ item.name }}</span>
      <span class="block mm-text-sm text-ink/60">
        {{ item.quantityText }} · {{ sourceCount(item) }} source{{ sourceCount(item) === 1 ? "" : "s" }}
      </span>
    </span>
  </label>
</template>
