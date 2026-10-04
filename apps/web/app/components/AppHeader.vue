<script setup lang="ts">
import { useRoute } from "#imports";
import { ChefHat, ListChecks, Settings, ShieldCheck } from "@lucide/vue";

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
  <aside class="relative z-40 border-b border-line bg-rail text-rail-foreground lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
    <div class="flex min-h-full flex-col">
      <div class="flex items-center justify-between border-b border-line px-4 py-4 sm:px-6 lg:block lg:py-6">
        <NuxtLink to="/plan" class="focus-ring group flex min-h-control items-center mm-gap-3 rounded-lg" aria-label="MealMind weekly workspace">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-strong text-strong-foreground">
            <ChefHat :size="21" :stroke-width="2.1" aria-hidden="true" />
          </span>
          <span class="min-w-0">
            <span class="block mm-text-lg font-bold tracking-tight">MealMind</span>
            <span class="block mm-text-xs text-rail-muted">Private meal planner</span>
          </span>
        </NuxtLink>
        <ShieldCheck class="shrink-0 text-rail-muted lg:hidden" :size="19" aria-label="Local and private" />
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
              :class="isActive(item.href) ? 'bg-strong text-strong-foreground' : 'text-rail-muted'"
              class="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md sm:flex"
            >
              <component :is="item.icon" :size="17" :stroke-width="2" aria-hidden="true" />
            </span>
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </nav>

      <div class="mt-auto hidden border-t border-line px-6 py-6 lg:block">
        <div class="flex items-start mm-gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rail-hover text-rail-muted">
            <ShieldCheck :size="17" aria-hidden="true" />
          </span>
          <div>
            <p class="mm-text-sm font-semibold">Runs locally</p>
            <p class="mm-mt-1 mm-text-xs leading-relaxed text-rail-muted">Your recipes and plans stay on this device.</p>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
