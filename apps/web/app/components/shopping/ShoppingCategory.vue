<script setup lang="ts">
import type { ShoppingItemDto } from "@mealmind/contracts";

defineProps<{ category: string; items: ShoppingItemDto[]; busyItemId: string | null }>();
const emit = defineEmits<{ update: [itemId: string, checked: boolean] }>();

function update(itemId: string, checked: boolean) {
  emit("update", itemId, checked);
}
</script>

<template>
  <section class="rounded-md bg-surface p-4 shadow-line">
    <h3 class="font-semibold">{{ category }}</h3>
    <div class="mt-3 divide-y divide-ink/10">
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
