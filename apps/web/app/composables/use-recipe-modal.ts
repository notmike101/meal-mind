import { useRouter, useState } from "#app";
import { computed, shallowRef } from "vue";
import type { RouteLocationNormalizedLoaded } from "vue-router";

type AppLayout = "default" | "wide";

type RecipeModalNavigation = {
  recipeId: string;
  servings: number;
  originFullPath: string;
  originLayout: AppLayout;
  targetPath: string;
};

const triggerElement = shallowRef<globalThis.HTMLElement | null>(null);
const originRoute = shallowRef<RouteLocationNormalizedLoaded | null>(null);

export function useRecipeModal() {
  const router = useRouter();
  const navigation = useState<RecipeModalNavigation | null>("recipe-modal-navigation", () => null);
  const active = computed(() => navigation.value?.targetPath === router.currentRoute.value.path);
  const activeRecipeId = computed(() => active.value ? navigation.value?.recipeId ?? null : null);

  async function openRecipe(recipeId: string, servings = 2, trigger?: globalThis.HTMLElement | null) {
    const targetPath = `/recipes/${encodeURIComponent(recipeId)}`;
    const currentRoute = router.currentRoute.value;
    triggerElement.value = trigger ?? null;
    originRoute.value = currentRoute;
    navigation.value = {
      recipeId,
      servings,
      originFullPath: currentRoute.fullPath,
      originLayout: currentRoute.meta.layout === "wide" ? "wide" : "default",
      targetPath,
    };

    try {
      await router.push(targetPath);
    } catch (error) {
      navigation.value = null;
      originRoute.value = null;
      triggerElement.value = null;
      throw error;
    }
  }

  function closeRecipe() {
    if (!active.value) return;
    router.back();
  }

  function restoreTriggerFocus() {
    const trigger = triggerElement.value;
    triggerElement.value = null;
    trigger?.focus();
  }

  function clearNavigation() {
    navigation.value = null;
    originRoute.value = null;
    triggerElement.value = null;
  }

  return {
    navigation,
    originRoute,
    active,
    activeRecipeId,
    openRecipe,
    closeRecipe,
    restoreTriggerFocus,
    clearNavigation,
  };
}
