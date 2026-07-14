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
  <aside class="relative z-40 border-b border-rail-foreground/10 bg-rail text-rail-foreground lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
    <div class="flex min-h-full flex-col">
      <div class="flex items-center justify-between border-b border-rail-foreground/15 px-4 py-4 sm:px-6 lg:block lg:px-7 lg:py-8">
        <NuxtLink to="/" class="focus-ring group flex items-center mm-gap-3 rounded-sm" aria-label="MealMind dashboard">
          <span class="flex h-10 w-10 items-center justify-center border border-rail-foreground/30 bg-rail-foreground text-rail transition-transform duration-200 group-hover:-rotate-3">
            <ChefHat :size="21" :stroke-width="2" aria-hidden="true" />
          </span>
          <span>
            <span class="mm-display block mm-text-xl font-semibold tracking-[-0.03em]">MealMind</span>
            <span class="block mm-text-xs uppercase tracking-[0.14em] text-rail-foreground/55">Weekly kitchen desk</span>
          </span>
        </NuxtLink>
        <ShieldCheck class="text-rail-foreground/60 lg:hidden" :size="18" aria-label="Local and private" />
      </div>

      <nav class="mm-scrollbar-none overflow-x-auto p-2 sm:px-4 lg:overflow-visible lg:px-4 lg:py-8" aria-label="Primary navigation">
        <p class="hidden px-3 pb-3 mm-text-xs font-bold uppercase tracking-[0.18em] text-rail-foreground/40 lg:block">Workspace</p>
        <div class="flex min-w-max mm-gap-1 lg:min-w-0 lg:flex-col lg:gap-2">
          <NuxtLink
            v-for="(item, index) in navItems"
            :key="item.href"
            :to="item.href"
            :aria-label="item.label"
            :aria-current="isActive(item.href) ? 'page' : undefined"
            :class="isActive(item.href)
              ? 'bg-rail-foreground text-rail'
              : 'text-rail-foreground/65 hover:bg-rail-foreground/10 hover:text-rail-foreground'"
            class="focus-ring group inline-flex min-h-11 items-center mm-gap-3 rounded-sm px-3 py-2.5 mm-text-sm font-semibold transition-colors lg:w-full"
          >
            <span class="hidden w-5 mm-text-xs font-medium tabular-nums opacity-45 lg:inline">0{{ index + 1 }}</span>
            <component :is="item.icon" :size="17" aria-hidden="true" />
            {{ item.label }}
          </NuxtLink>
        </div>
      </nav>

      <div class="mt-auto hidden border-t border-rail-foreground/15 px-7 py-7 lg:block">
        <div class="flex items-start mm-gap-3">
          <ShieldCheck class="mt-0.5 shrink-0 text-moss" :size="18" aria-hidden="true" />
          <div>
            <p class="mm-text-sm font-semibold">Local workspace</p>
            <p class="mm-mt-1 mm-text-xs leading-relaxed text-rail-foreground/50">Your recipes and plans stay on this machine.</p>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
