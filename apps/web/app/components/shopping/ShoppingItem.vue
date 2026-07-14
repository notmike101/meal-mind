<script setup lang="ts">
import type { ShoppingItemDto } from "@mealmind/contracts";

defineProps<{ item: ShoppingItemDto; busy: boolean }>();
const emit = defineEmits<{ update: [itemId: string, checked: boolean] }>();

function sourceCount(item: ShoppingItemDto) {
  return (JSON.parse(item.sourceRecipeIds) as string[]).length;
}
</script>

<template>
  <label class="group -mx-2 flex cursor-pointer gap-3 rounded-xl px-2 py-3.5 transition-colors hover:bg-field/60">
    <input
      type="checkbox"
      :checked="item.checked"
      :disabled="busy"
      class="focus-ring mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-line/40 accent-moss"
      @change="emit('update', item.id, ($event.target as HTMLInputElement).checked)"
    />
    <span class="min-w-0 flex-1" :class="item.checked ? 'text-ink/40 line-through' : ''">
      <span class="block break-words text-sm font-semibold transition-colors group-hover:text-moss">{{ item.name }}</span>
      <span class="mt-1 block break-words text-xs text-ink/55">
        {{ item.quantityText }} · {{ sourceCount(item) }} source{{ sourceCount(item) === 1 ? "" : "s" }}
      </span>
    </span>
  </label>
</template>
