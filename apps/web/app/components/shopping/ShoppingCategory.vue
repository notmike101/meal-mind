<script setup lang="ts">
import type { ShoppingItemDto } from "@mealmind/contracts";

defineProps<{ category: string; items: ShoppingItemDto[]; busyItemId: string | null }>();
const emit = defineEmits<{ update: [itemId: string, checked: boolean] }>();

function update(itemId: string, checked: boolean) {
  emit("update", itemId, checked);
}
</script>

<template>
  <section class="border-t-2 border-ink pt-4">
    <div class="flex items-end justify-between mm-gap-3 border-b border-line/25 mm-pb-4">
      <h3 class="mm-display mm-text-2xl font-semibold">{{ category }}</h3>
      <span class="mm-display mm-text-xl font-semibold tabular-nums text-ink/45">{{ items.length }}</span>
    </div>
    <div class="divide-y divide-line/20">
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
