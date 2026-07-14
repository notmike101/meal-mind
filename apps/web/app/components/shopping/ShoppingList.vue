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
  <div class="space-y-6">
    <section class="rounded-2xl border border-line/25 bg-surface p-5 shadow-sm sm:p-6">
      <div class="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div class="flex items-center gap-4">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-moss/10 text-moss">
            <ShoppingBasket :size="20" aria-hidden="true" />
          </span>
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-moss">Your list</p>
            <h2 class="mt-1 text-xl font-semibold tracking-tight text-ink">Shopping progress</h2>
            <p class="mt-1 text-sm text-ink/55">
              {{ remainingCount }} item{{ remainingCount === 1 ? "" : "s" }} left · {{ checkedCount }} complete
            </p>
          </div>
        </div>
        <div class="flex items-center justify-between gap-5 md:justify-end">
          <span class="text-4xl font-semibold leading-none tracking-[-0.04em] tabular-nums text-ink">{{ progress }}%</span>
          <button
            v-if="canRegenerate"
            type="button"
            :disabled="busy === 'regenerate'"
            class="focus-ring mm-button-secondary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
            @click="regenerate"
          >
            <RefreshCw :size="15" :class="busy === 'regenerate' ? 'animate-spin' : ''" aria-hidden="true" /> Regenerate
          </button>
        </div>
      </div>
      <div
        class="mt-6 h-2 overflow-hidden rounded-full bg-field"
        role="progressbar"
        aria-label="Shopping completion"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progress"
      >
        <div class="h-full rounded-full bg-moss transition-[width] duration-500" :style="{ width: `${progress}%` }" />
      </div>
    </section>
    <div v-if="items.length" class="grid items-start gap-5 xl:grid-cols-2">
      <ShoppingCategory
        v-for="([category, categoryItems]) in grouped"
        :key="category"
        :category="category"
        :items="categoryItems"
        :busy-item-id="busy"
        @update="updateItem"
      />
    </div>
    <div v-else class="rounded-2xl border border-dashed border-line/35 bg-surface px-6 py-16 text-center text-ink/60">
      <p class="font-medium text-ink">Your shopping list is empty</p>
      <p class="mt-1 text-sm">Generate the list from an editable meal plan to get started.</p>
    </div>
    <p v-if="error" role="alert" class="rounded-xl bg-tomato/10 px-4 py-3 text-sm font-medium text-tomato">{{ error }}</p>
  </div>
</template>
