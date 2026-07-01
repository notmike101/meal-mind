<script setup lang="ts">
import { CalendarDays, ChefHat, ListChecks, Settings, ShoppingBasket } from "@lucide/vue";

const navItems = [
  { href: "/", label: "Dashboard", icon: CalendarDays },
  { href: "/plan", label: "Plan", icon: ListChecks },
  { href: "/shopping", label: "Shopping", icon: ShoppingBasket },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/settings", label: "Settings", icon: Settings },
];
</script>

<template>
  <header class="border-b border-ink/10 bg-surface">
    <div class="mm-shell-container flex flex-col mm-gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <NuxtLink to="/" class="flex items-center mm-gap-3">
        <span class="flex mm-h-10 mm-w-10 items-center justify-center rounded-md bg-moss text-white">
          <ChefHat :size="22" aria-hidden="true" />
        </span>
        <span>
          <span class="block mm-text-lg font-semibold mm-leading-tight">MealMind</span>
          <span class="block mm-text-sm text-ink/60">Local weekly meal planning</span>
        </span>
      </NuxtLink>
      <nav class="flex flex-wrap mm-gap-2" aria-label="Primary navigation">
        <NuxtLink
          v-for="item in navItems"
          :key="item.href"
          :to="item.href"
          class="focus-ring inline-flex items-center mm-gap-2 rounded-md mm-px-3 mm-py-2 mm-text-sm font-medium text-ink/75 hover:bg-ink/5 hover:text-ink"
        >
          <component :is="item.icon" :size="16" aria-hidden="true" />
          {{ item.label }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
