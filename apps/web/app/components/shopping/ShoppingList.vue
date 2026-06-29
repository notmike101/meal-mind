<script setup lang="ts">
import type { ShoppingItemDto } from "@mealmind/contracts";
import { RefreshCw, ShoppingBasket } from "@lucide/vue";
import { computed, ref } from "vue";
import { errorMessage } from "~/composables/use-api";
import { useShoppingStore } from "~/stores/shopping";

const props = defineProps<{ items: ShoppingItemDto[]; canRegenerate: boolean }>();
const shopping = useShoppingStore();
const busy = ref<string | null>(null);
const error = ref<string | null>(null);
const grouped = computed(() => {
  const groups = new Map<string, ShoppingItemDto[]>();
  for (const item of props.items) groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  return [...groups.entries()];
});

async function updateItem(itemId: string, checked: boolean) {
  busy.value = itemId;
  error.value = null;
  try {
    await shopping.updateItem(itemId, checked);
  } catch (caught) {
    error.value = errorMessage(caught, "Could not update item.");
  } finally {
    busy.value = null;
  }
}

async function regenerate() {
  busy.value = "regenerate";
  error.value = null;
  try {
    await shopping.regenerate();
  } catch (caught) {
    error.value = errorMessage(caught, "Could not regenerate shopping list.");
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-2">
        <ShoppingBasket :size="20" aria-hidden="true" />
        <h2 class="text-xl font-semibold">Shopping list</h2>
      </div>
      <button
        v-if="canRegenerate"
        type="button"
        :disabled="busy === 'regenerate'"
        class="focus-ring inline-flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-medium hover:bg-field"
        @click="regenerate"
      >
        <RefreshCw :size="15" :class="busy === 'regenerate' ? 'animate-spin' : ''" aria-hidden="true" /> Regenerate
      </button>
    </div>
    <ShoppingShoppingCategory
      v-for="([category, categoryItems]) in grouped"
      :key="category"
      :category="category"
      :items="categoryItems"
      :busy-item-id="busy"
      @update="updateItem"
    />
    <div v-if="items.length === 0" class="rounded-md border border-dashed border-ink/20 bg-surface p-6 text-ink/70">
      No shopping items have been generated yet.
    </div>
    <p v-if="error" class="text-sm text-tomato">{{ error }}</p>
  </div>
</template>
