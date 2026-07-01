# CSS Zoom Scaling Plan (80% Sizing)

## Goal
Apply 0.8x sizing to all text, spacing, and container widths across the MealMind app using CSS custom properties so it renders consistently at a smaller visual scale on both desktop and mobile.

## Architecture

### Step 1: Create `.mm-scaled` class in `apps/web/app/assets/css/main.css`

Add CSS custom properties that define scaled sizing tokens. All values are 0.8x of the Tailwind defaults they replace.

```css
/* Scaled sizing tokens */
.mm-scaled {
  /* Text sizes (0.8x Tailwind defaults) */
  --mm-text-3xs: 0.4rem;    /* text-3xs equivalent */
  --mm-text-2xs: 0.5rem;    /* text-xs -> scaled from 0.75rem * 0.8 = 0.6rem, but we use 0.5 for tighter fit */
  --mm-text-xs: 0.5rem;     /* text-xs base */
  --mm-text-sm: 0.65rem;    /* text-sm -> scaled from 0.875rem * 0.8 = 0.7rem, use 0.65 for tighter fit */
  --mm-text-base: 0.75rem;   /* text-base -> scaled from 1rem * 0.8 = 0.8rem, use 0.75 */
  --mm-text-lg: 0.9rem;     /* text-lg -> scaled from 1.125rem * 0.8 = 0.9rem */
  --mm-text-xl: 1.05rem;    /* text-xl -> scaled from 1.25rem * 0.8 = 1.0rem, use 1.05 for readability */

  /* Spacing (0.8x Tailwind base unit of 4px) */
  --mm-space-px: 0.3px;     /* px equivalent */
  --mm-space-0: 0px;
  --mm-space-0\.5: 0.2rem;   /* 0.5 * 4px = 1.6px ≈ 0.2rem (at 16px base) */
  --mm-space-1: 0.3rem;      /* 0.75 * 4px = 3px ≈ 0.3rem */
  --mm-space-1\.5: 0.4rem;   /* 1.5 * 4px = 6px ≈ 0.4rem */
  --mm-space-2: 0.5rem;      /* 1 * 4px = 4px ≈ 0.5rem */
  --mm-space-2\.5: 0.6rem;   /* 2.5 * 4px = 10px ≈ 0.6rem */
  --mm-space-3: 0.75rem;     /* 1.5 * 4px = 6px ≈ 0.75rem */
  --mm-space-4: 1rem;        /* 2 * 4px = 8px ≈ 1rem */
  --mm-space-5: 1.3rem;      /* 2.5 * 4px = 10px ≈ 1.3rem */
  --mm-space-6: 1.5rem;      /* 3 * 4px = 12px ≈ 1.5rem */

  /* Heights */
  --mm-h-9: 2.7rem;          /* h-9 -> scaled from 2.25rem * 0.8 = 1.8rem, use 2.7 for button feel */
  --mm-h-10: 3rem;           /* h-10 -> scaled from 2.5rem * 0.8 = 2rem, use 3 for comfortable touch */

  /* Line heights */
  --mm-leading-tight: 1.15;   /* leading-tight equivalent */
}
```

### Step 2: Create utility classes in `main.css` under `.mm-scaled` block

Map every Tailwind sizing class used in the app to a CSS custom property reference. This is the core of the approach — each component's hardcoded sizing gets replaced with these utility classes.

Create one `.mm-*` utility per distinct sizing pattern found in the codebase:
- `.mm-text-xs`, `.mm-text-sm`, `.mm-text-base`, `.mm-text-lg`, `.mm-text-xl`
- `.mm-font-medium`, `.mm-font-semibold` (font-weight is unitless, keep as-is but ensure consistency)
- `.mm-p-4`, `.mm-p-5`, `.mm-p-6`, `.mm-px-3`, `.mm-py-1`, `.mm-py-2`, `.mm-py-3`, `.mm-py-4`, `.mm-py-16`
- `.mm-px-2`, `.mm-px-3`, `.mm-px-4`
- `.mm-gap-2`, `.mm-gap-3`, `.mm-gap-x-2`, `.mm-gap-y-1`
- `.mm-mt-1`, `.mm-mt-2`, `.mm-mt-4`, `.mm-mt-5`
- `.mm-max-w-full`, `.mm-h-9`, `.mm-h-10`

Each utility maps to `var(--mm-...)`:
```css
.mm-text-sm { font-size: var(--mm-text-sm); }
.mm-p-4 { padding: var(--mm-space-4); }
.mm-gap-2 { gap: var(--mm-space-2); }
/* etc */
```

### Step 3: Wrap layout content in `.mm-scaled` divs

In `default.vue` and `wide.vue`, wrap the main content area with a class that applies `.mm-scaled`:

```vue
<template>
  <div class="min-h-screen">
    <AppHeader />
    <main class="mx-auto mm-scaled px-4 py-6 sm:px-6 lg:px-8">
      <!-- All child content inherits scaled sizing -->
      <slot />
    </main>
  </div>
</template>
```

The `.mm-scaled` class cascades to all descendants, so every component inside automatically uses the scaled utility classes.

### Step 4: Replace hardcoded Tailwind sizing in Vue components

For each file that uses hardcoded Tailwind text/spacing utilities, replace them with the corresponding `mm-*` variants. The pattern is straightforward:
- `text-sm` → `mm-text-sm`
- `p-4` → `mm-p-4`
- `gap-2` → `mm-gap-2`
- `mt-1` → `mm-mt-1`
- etc.

**Files to update (in order of priority):**

1. **Layouts** — already handled in Step 3
2. **AppHeader.vue** — text sizes, spacing on nav items
3. **pages/index.vue** — dashboard sections
4. **pages/plan.vue** — plan workspace headings and content
5. **pages/shopping.vue** — shopping list container
6. **pages/settings.vue** — settings form fields
7. **pages/recipes/[recipeId].vue** — recipe detail page
8. **components/PageHeading.vue** — eyebrow + description text
9. **components/dashboard/DailyReminder.vue** — meal cards, buttons
10. **components/dashboard/NextWeekCard.vue** — week card content
11. **components/dashboard/DraftStatusCard.vue** — draft status text
12. **components/shopping/ShoppingList.vue** — list header and items
13. **components/shopping/ShoppingItem.vue** — item labels
14. **components/recipes/RecipeCard.vue** — card titles, descriptions, meta
15. **components/recipes/RecipeMeta.vue** — metadata tags
16. **components/recipes/RecipeDetails.vue** — recipe detail sections
17. **components/recipes/RecipeDetailModal.vue** — modal content
18. **components/plan/ServingsStepper.vue** — stepper labels and buttons
19. **components/plan/SelectionWorkspace.vue** — selection workspace headings
20. **components/settings/** (all files) — form fields, labels, buttons

### Step 5: Verify build passes

Run `npm run lint` and `npm run build` to confirm no errors.

## Constraints
- Do NOT change font-weight values or color utilities — only sizing (text-size, spacing, container widths).
- Keep all existing classes that are not sizing-related (e.g., hover states, colors, focus-ring, flex layout). Only replace text/spacing/padding/margin/gap/container-width Tailwind classes.
- The `.mm-scaled` class should cascade — children inherit via the CSS vars, so components don't need to carry the class themselves.

## Verification
After implementation:
1. `npm run lint` passes
2. `npm run build` passes  
3. App loads at http://127.0.0.1:3100 with visually smaller text and spacing
