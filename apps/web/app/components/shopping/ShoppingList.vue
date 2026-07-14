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
  <div class="mm-space-y-4">
    <section class="mm-panel mm-p-5 sm:p-6">
      <div class="flex flex-col mm-gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-center mm-gap-3">
          <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-moss/10 text-moss">
            <ShoppingBasket :size="21" aria-hidden="true" />
          </span>
          <div>
            <h2 class="mm-text-xl font-bold">Shopping progress</h2>
            <p class="mm-mt-1 mm-text-sm text-ink/55">
              {{ remainingCount }} item{{ remainingCount === 1 ? "" : "s" }} left · {{ checkedCount }} complete
            </p>
          </div>
        </div>
        <button
          v-if="canRegenerate"
          type="button"
          :disabled="busy === 'regenerate'"
          class="focus-ring mm-button-secondary inline-flex items-center justify-center mm-gap-2 mm-px-4 mm-py-2 mm-text-sm font-bold"
          @click="regenerate"
        >
          <RefreshCw :size="15" :class="busy === 'regenerate' ? 'animate-spin' : ''" aria-hidden="true" /> Regenerate
        </button>
      </div>
      <div
        class="mm-mt-5 h-2.5 overflow-hidden rounded-full bg-field"
        role="progressbar"
        aria-label="Shopping completion"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progress"
      >
        <div class="h-full rounded-full bg-gradient-to-r from-strong to-moss transition-[width] duration-500" :style="{ width: `${progress}%` }" />
      </div>
    </section>
    <div class="grid items-start mm-gap-4 lg:grid-cols-2">
      <ShoppingCategory
        v-for="([category, categoryItems]) in grouped"
        :key="category"
        :category="category"
        :items="categoryItems"
        :busy-item-id="busy"
        @update="updateItem"
      />
    </div>
    <div v-if="items.length === 0" class="mm-panel border-dashed mm-p-8 text-center text-ink/60">
      No shopping items have been generated yet.
    </div>
    <p v-if="error" class="mm-text-sm text-tomato">{{ error }}</p>
  </div>
</template>
