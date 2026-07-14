<script setup lang="ts">
import type { ShoppingItemDto } from "@mealmind/contracts";

defineProps<{ category: string; items: ShoppingItemDto[]; busyItemId: string | null }>();
const emit = defineEmits<{ update: [itemId: string, checked: boolean] }>();

function update(itemId: string, checked: boolean) {
  emit("update", itemId, checked);
}
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-line/25 bg-surface shadow-sm">
    <div class="flex items-center justify-between gap-3 border-b border-line/20 bg-field/40 px-5 py-4">
      <h3 class="text-base font-semibold text-ink">{{ category }}</h3>
      <span class="inline-flex min-w-7 items-center justify-center rounded-full bg-surface px-2.5 py-1 text-xs font-semibold tabular-nums text-ink/60">{{ items.length }}</span>
    </div>
    <div class="divide-y divide-line/20 px-5">
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
