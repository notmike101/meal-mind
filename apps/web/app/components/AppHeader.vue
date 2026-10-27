<script setup lang="ts">
import { useRoute } from "#imports";
import { ChefHat, ListChecks, Settings } from "@lucide/vue";

const route = useRoute();

const navItems = [
  { href: "/plan", label: "Plan", icon: ListChecks },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(href: string) {
  return route.path.startsWith(href);
}
</script>

<template>
  <aside class="mm-navigation relative z-40 border-b border-line bg-rail text-rail-foreground lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
    <div class="flex min-h-full flex-col">
      <div class="flex items-center justify-between border-b border-line px-4 py-4 sm:px-6 lg:block lg:py-6">
        <NuxtLink to="/plan" class="focus-ring group flex min-h-control items-center mm-gap-3 rounded-lg" aria-label="MealMind weekly workspace">
          <span class="min-w-0">
            <span class="mm-brand block font-bold tracking-tight">MealMind</span>
          </span>
        </NuxtLink>
      </div>

      <nav class="p-2 sm:px-4 lg:px-3 lg:py-6" aria-label="Primary navigation">
        <div class="grid grid-cols-3 mm-gap-1 lg:grid-cols-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.href"
            :to="item.href"
            :aria-label="item.label"
            :aria-current="isActive(item.href) ? 'page' : undefined"
            class="focus-ring mm-nav-item justify-center mm-text-sm font-semibold lg:justify-start"
          >
            <span
              class="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md sm:flex"
            >
              <component :is="item.icon" :size="17" :stroke-width="2" aria-hidden="true" />
            </span>
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </nav>
    </div>
  </aside>
</template>
