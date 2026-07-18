<script setup lang="ts">
import { useHead, useNuxtApp, useRoute, useRouter } from "#imports";
import { computed, nextTick, watch } from "vue";
import { useRecipeModal } from "~/composables/use-recipe-modal";

const route = useRoute();
const router = useRouter();
const nuxtApp = useNuxtApp();
const recipeModal = useRecipeModal();
const displayedRoute = computed(() => {
  if (!recipeModal.active.value || !recipeModal.navigation.value) return undefined;
  return recipeModal.originRoute.value ?? route;
});
const displayedLayout = computed(() => recipeModal.active.value
  ? recipeModal.navigation.value?.originLayout
  : undefined);

nuxtApp.hook("page:finish", () => {
  document.documentElement.dataset.mealmindReady = route.fullPath;
});

if (import.meta.client) {
  watch(() => router.currentRoute.value.fullPath, async (fullPath) => {
    await nextTick();
    document.documentElement.dataset.mealmindReady = fullPath;
  }, { flush: "post" });
}

watch(() => router.currentRoute.value.fullPath, (fullPath) => {
  const navigation = recipeModal.navigation.value;
  if (!navigation) return;
  const path = fullPath.split(/[?#]/, 1)[0];
  if (fullPath !== navigation.originFullPath && path !== navigation.targetPath) {
    recipeModal.clearNavigation();
  }
}, { flush: "sync" });

const themeScript = `
(() => {
  const storageKey = "mealmind-theme";
  const valid = (value) => value === "system" || value === "light" || value === "dark";
  const systemTheme = () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    const stored = window.localStorage.getItem(storageKey);
    const preference = valid(stored) ? stored : "system";
    document.documentElement.dataset.theme = preference === "system" ? systemTheme() : preference;
  } catch {
    document.documentElement.dataset.theme = systemTheme();
  }
})();
`;

useHead({
  htmlAttrs: { lang: "en" },
  title: "MealMind",
  meta: [{ name: "description", content: "Local AI meal planning with CookLang recipes." }],
  script: [{ innerHTML: themeScript }],
});
</script>

<template>
  <NuxtLayout :name="displayedLayout">
    <NuxtPage :route="displayedRoute" />
  </NuxtLayout>
  <RecipesRecipeDetailModal
    v-if="recipeModal.activeRecipeId.value"
    :recipe-id="recipeModal.activeRecipeId.value"
    :servings="recipeModal.navigation.value?.servings ?? 2"
  />
</template>
