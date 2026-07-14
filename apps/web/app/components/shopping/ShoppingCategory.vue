<script setup lang="ts">
import type { ShoppingItemDto } from "@mealmind/contracts";

defineProps<{ category: string; items: ShoppingItemDto[]; busyItemId: string | null }>();
const emit = defineEmits<{ update: [itemId: string, checked: boolean] }>();

function update(itemId: string, checked: boolean) {
  emit("update", itemId, checked);
}
</script>

<template>
  <section class="mm-panel overflow-hidden mm-p-5">
    <div class="flex items-center justify-between mm-gap-3 border-b border-line/10 mm-pb-3">
      <h3 class="mm-text-lg font-bold">{{ category }}</h3>
      <span class="rounded-full bg-field mm-px-3 mm-py-1 mm-text-xs font-bold text-ink/55">{{ items.length }}</span>
    </div>
    <div class="mm-mt-2 divide-y divide-line/10">
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
