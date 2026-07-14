<script setup lang="ts">
import { useRoute } from "#imports";
import { CalendarDays, ChefHat, ListChecks, Settings, ShieldCheck, ShoppingBasket } from "@lucide/vue";

const route = useRoute();

const navItems = [
  { href: "/", label: "Dashboard", icon: CalendarDays },
  { href: "/plan", label: "Plan", icon: ListChecks },
  { href: "/shopping", label: "Shopping", icon: ShoppingBasket },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(href: string) {
  return href === "/" ? route.path === href : route.path.startsWith(href);
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-line/10 bg-surface/80 backdrop-blur-xl">
    <div class="mm-shell-container flex flex-col mm-gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div class="flex items-center justify-between mm-gap-4">
        <NuxtLink to="/" class="focus-ring group flex items-center mm-gap-3 rounded-xl" aria-label="MealMind dashboard">
          <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-strong to-moss text-strong-foreground shadow-lg shadow-moss/20 transition duration-200 group-hover:-rotate-3 group-hover:scale-105">
            <ChefHat :size="23" :stroke-width="2.2" aria-hidden="true" />
          </span>
          <span>
            <span class="block mm-text-lg font-bold tracking-tight">MealMind</span>
            <span class="block mm-text-xs font-medium text-ink/55">Plan well. Eat easy.</span>
          </span>
        </NuxtLink>
        <span class="hidden items-center mm-gap-2 rounded-full border border-moss/15 bg-moss/10 mm-px-3 mm-py-2 mm-text-xs font-semibold text-moss sm:inline-flex lg:hidden">
          <ShieldCheck :size="14" aria-hidden="true" /> Local & private
        </span>
      </div>
      <nav class="-mx-1 flex overflow-x-auto px-1 pb-1 lg:mx-0 lg:overflow-visible lg:p-0" aria-label="Primary navigation">
        <div class="flex min-w-max items-center mm-gap-1 rounded-2xl border border-line/10 bg-field/70 mm-p-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.href"
            :to="item.href"
            :aria-current="isActive(item.href) ? 'page' : undefined"
            :class="isActive(item.href)
              ? 'bg-surface text-strong shadow-sm ring-1 ring-line/10'
              : 'text-ink/60 hover:bg-surface/70 hover:text-ink'"
            class="focus-ring inline-flex min-h-10 items-center mm-gap-2 rounded-xl mm-px-3 mm-py-2 mm-text-sm font-semibold transition duration-200"
          >
            <component :is="item.icon" :size="16" aria-hidden="true" />
            {{ item.label }}
          </NuxtLink>
        </div>
      </nav>
    </div>
  </header>
</template>
