<script setup lang="ts">
import type { ShoppingItemDto } from "@mealmind/contracts";
import { RefreshCw } from "@lucide/vue";
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
const checkedCount = computed(() => props.items.filter((item) => item.checked).length);
const remainingCount = computed(() => props.items.length - checkedCount.value);
const progress = computed(() => props.items.length ? Math.round((checkedCount.value / props.items.length) * 100) : 0);

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
  <div class="mm-space-y-6">
    <header class="mm-space-y-3 border-b border-line mm-pb-4">
      <div class="flex flex-wrap items-center justify-between mm-gap-4">
        <div>
          <h2 class="mm-text-xl font-semibold">Shopping checklist</h2>
          <p class="mm-mt-1 mm-text-sm text-steel" aria-live="polite">{{ remainingCount }} item{{ remainingCount === 1 ? '' : 's' }} left · {{ checkedCount }} complete · {{ progress }}%</p>
        </div>
        <button v-if="canRegenerate" type="button" :disabled="busy === 'regenerate'" class="focus-ring mm-button-secondary inline-flex items-center justify-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-semibold" @click="regenerate">
          <RefreshCw :size="15" :class="busy === 'regenerate' ? 'animate-spin' : ''" aria-hidden="true" /> Regenerate
        </button>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-field" role="progressbar" aria-label="Shopping completion" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="progress">
        <div class="h-full rounded-full bg-success transition-[width]" :style="{ width: `${progress}%` }" />
      </div>
    </header>
    <div v-if="items.length" class="grid items-start mm-gap-4 xl:grid-cols-2">
      <ShoppingCategory v-for="([category, categoryItems]) in grouped" :key="category" :category="category" :items="categoryItems" :busy-item-id="busy" @update="updateItem" />
    </div>
    <div v-else class="mm-panel border-dashed mm-p-8 text-center text-steel">
      <p class="font-medium text-ink">Your shopping list is empty</p>
      <p class="mm-mt-1 mm-text-sm">Generate the list from an editable meal plan to get started.</p>
    </div>
    <p v-if="error" role="alert" class="mm-status-error">{{ error }}</p>
  </div>
</template>
