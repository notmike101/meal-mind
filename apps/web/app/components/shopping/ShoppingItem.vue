<script setup lang="ts">
import type { ShoppingItemDto } from "@mealmind/contracts";

defineProps<{ item: ShoppingItemDto; busy: boolean }>();
const emit = defineEmits<{ update: [itemId: string, checked: boolean] }>();

function sourceCount(item: ShoppingItemDto) {
  return (JSON.parse(item.sourceRecipeIds) as string[]).length;
}
</script>

<template>
  <label class="group flex cursor-pointer mm-gap-3 mm-py-3 transition-colors hover:bg-field/60">
    <input
      type="checkbox"
      :checked="item.checked"
      :disabled="busy"
      class="focus-ring mm-mt-1 h-5 w-5 shrink-0 cursor-pointer rounded-md accent-moss"
      @change="emit('update', item.id, ($event.target as HTMLInputElement).checked)"
    />
    <span class="min-w-0" :class="item.checked ? 'text-ink/40 line-through' : ''">
      <span class="block font-semibold transition-colors group-hover:text-moss">{{ item.name }}</span>
      <span class="mm-mt-1 block mm-text-sm text-ink/55">
        {{ item.quantityText }} · {{ sourceCount(item) }} source{{ sourceCount(item) === 1 ? "" : "s" }}
      </span>
    </span>
  </label>
</template>
