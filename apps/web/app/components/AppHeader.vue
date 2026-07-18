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
  <aside class="relative z-40 border-b border-rail-foreground/10 bg-rail text-rail-foreground lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
    <div class="flex min-h-full flex-col">
      <div class="flex items-center justify-between border-b border-rail-foreground/10 px-4 py-4 sm:px-6 lg:block lg:px-6 lg:py-7">
        <NuxtLink to="/plan" class="focus-ring group flex items-center mm-gap-3 rounded-lg" aria-label="MealMind weekly workspace">
          <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-strong text-strong-foreground shadow-soft transition-transform duration-200 group-hover:-translate-y-0.5">
            <ChefHat :size="21" :stroke-width="2.1" aria-hidden="true" />
          </span>
          <span class="min-w-0">
            <span class="block mm-text-lg font-bold tracking-[-0.025em]">MealMind</span>
            <span class="block truncate mm-text-xs text-rail-foreground/60">Private meal planner</span>
          </span>
        </NuxtLink>
        <ShieldCheck class="text-rail-foreground/65 lg:hidden" :size="19" aria-label="Local and private" />
      </div>

      <nav class="mm-scrollbar-none overflow-x-auto p-2 sm:px-4 lg:overflow-visible lg:px-3 lg:py-6" aria-label="Primary navigation">
        <div class="flex min-w-max mm-gap-1 lg:min-w-0 lg:flex-col lg:gap-1.5">
          <NuxtLink
            v-for="item in navItems"
            :key="item.href"
            :to="item.href"
            :aria-label="item.label"
            :aria-current="isActive(item.href) ? 'page' : undefined"
            :class="isActive(item.href)
              ? 'bg-rail-foreground/[0.12] text-rail-foreground shadow-sm ring-1 ring-inset ring-rail-foreground/10'
              : 'text-rail-foreground/65 hover:bg-rail-foreground/[0.07] hover:text-rail-foreground'"
            class="focus-ring group inline-flex min-h-11 items-center mm-gap-3 rounded-lg px-3 py-2 mm-text-sm font-semibold transition-all duration-150 lg:w-full"
          >
            <span
              :class="isActive(item.href) ? 'bg-strong text-strong-foreground' : 'bg-rail-foreground/[0.06] text-rail-foreground/70 group-hover:bg-rail-foreground/10 group-hover:text-rail-foreground'"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors"
            >
              <component :is="item.icon" :size="17" :stroke-width="2" aria-hidden="true" />
            </span>
            <span>{{ item.label }}</span>
          </NuxtLink>
        </div>
      </nav>

      <div class="mt-auto hidden border-t border-rail-foreground/10 px-6 py-6 lg:block">
        <div class="flex items-start mm-gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rail-foreground/[0.07] text-rail-foreground/75">
            <ShieldCheck :size="17" aria-hidden="true" />
          </span>
          <div>
            <p class="mm-text-sm font-semibold">Runs locally</p>
            <p class="mm-mt-1 mm-text-xs leading-relaxed text-rail-foreground/60">Your recipes and plans stay on this device.</p>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
