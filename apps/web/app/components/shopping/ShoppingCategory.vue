<script setup lang="ts">
import type { ShoppingItemDto } from "@mealmind/contracts";

defineProps<{ category: string; items: ShoppingItemDto[]; busyItemId: string | null }>();
const emit = defineEmits<{ update: [itemId: string, checked: boolean] }>();

function update(itemId: string, checked: boolean) {
  emit("update", itemId, checked);
}
</script>

<template>
  <section class="mm-panel min-w-0 overflow-hidden">
    <div class="flex items-center justify-between gap-3 border-b border-line bg-field px-5 py-4">
      <h3 class="min-w-0 break-words text-base font-semibold text-ink">{{ category }}</h3>
      <span class="inline-flex min-w-7 items-center justify-center rounded-full bg-surface px-2.5 py-1 text-xs font-semibold tabular-nums text-steel">{{ items.length }}</span>
    </div>
    <div class="divide-y divide-line px-5">
      <ShoppingItem
        v-for="item in items"
        :key="item.id"
        :item="item"
        :busy="busyItemId === item.id"
        @update="update"
      />
    </div>
  </section>
</template>
