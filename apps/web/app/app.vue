<script setup lang="ts">
import { useHead } from "#imports";

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
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
