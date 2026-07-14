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
    <section class="border-y border-line/40 bg-surface px-5 py-6 sm:px-6">
      <div class="grid mm-gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div class="flex items-center mm-gap-4">
          <span class="flex h-11 w-11 items-center justify-center border border-ink bg-ink text-canvas">
            <ShoppingBasket :size="20" aria-hidden="true" />
          </span>
          <div>
            <p class="mm-text-xs font-bold uppercase tracking-[0.18em] text-moss">Run status</p>
            <h2 class="mm-display mm-mt-1 mm-text-2xl font-semibold">Shopping progress</h2>
            <p class="mm-mt-1 mm-text-sm text-ink/55">
              {{ remainingCount }} item{{ remainingCount === 1 ? "" : "s" }} left · {{ checkedCount }} complete
            </p>
          </div>
        </div>
        <div class="flex items-end justify-between mm-gap-5 sm:justify-end">
          <span class="mm-display text-5xl font-semibold leading-none tabular-nums">{{ progress }}%</span>
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
      </div>
      <div
        class="mm-mt-6 h-1 overflow-hidden bg-field"
        role="progressbar"
        aria-label="Shopping completion"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progress"
      >
        <div class="h-full bg-tomato transition-[width] duration-500" :style="{ width: `${progress}%` }" />
      </div>
    </section>
    <div class="grid items-start gap-x-10 gap-y-12 lg:grid-cols-2">
      <ShoppingCategory
        v-for="([category, categoryItems]) in grouped"
        :key="category"
        :category="category"
        :items="categoryItems"
        :busy-item-id="busy"
        @update="updateItem"
      />
    </div>
    <div v-if="items.length === 0" class="border-y border-dashed border-line/40 py-16 text-center text-ink/60">
      No shopping items have been generated yet.
    </div>
    <p v-if="error" class="mm-text-sm text-tomato">{{ error }}</p>
  </div>
</template>
