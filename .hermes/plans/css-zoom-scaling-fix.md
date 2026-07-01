# CSS Zoom Scaling Fix — Correct 0.8x Tokens + Remaining Classes

## Issues found by Codex verification:

1. **Spacing tokens are at 1× Tailwind defaults** instead of ~0.8×. Example: `--mm-space-4` is `1rem` (same as original `p-4`).
2. **h-9 and h-10 are oversized** — they're larger than the originals, not smaller.
3. **Container widths (.mm-max-w-*) use hardcoded values unchanged from Tailwind** instead of 0.8× scaled versions.
4. **Several components still have unconverted sizing classes**:
   - `GeneratePlanButton.vue` — overlay has `p-4`, buttons have `px-4 py-2 gap-3`
   - `ScheduleStrip.vue` — has `pb-2` and `p-1`
   - `RecipeSwapControls.vue` — swap button has `gap-2`
   - `RecipeDetailModal.vue` — modal content area has `max-w-6xl`

## Fix for main.css tokens (correct 0.8× Tailwind defaults):

Replace ALL CSS custom property values in `.mm-scaled` with these correct 0.8× values:

```css
/* Text sizes (Tailwind * 0.8) */
--mm-text-xs: 0.6rem;      /* text-xs: 0.75rem → 0.6rem */
--mm-text-sm: 0.7rem;      /* text-sm: 0.875rem → 0.7rem */
--mm-text-base: 0.8rem;    /* text-base: 1rem → 0.8rem */
--mm-text-lg: 0.9rem;      /* text-lg: 1.125rem → 0.9rem */
--mm-text-xl: 1rem;        /* text-xl: 1.25rem → 1rem */
--mm-text-2xl: 1.2rem;     /* text-2xl: 1.5rem → 1.2rem */
--mm-text-3xl: 1.5rem;     /* text-3xl: 1.875rem → 1.5rem */

/* Spacing (Tailwind rem * 0.8) */
--mm-space-px: 0.2rem;         /* px: 0.25rem → 0.2rem */
--mm-space-0: 0rem;
--mm-space-0\.5: 0.1rem;       /* 0.5: 0.125rem → 0.1rem */
--mm-space-1: 0.2rem;          /* 1: 0.25rem → 0.2rem */
--mm-space-1\.5: 0.3rem;       /* 1.5: 0.375rem → 0.3rem */
--mm-space-2: 0.4rem;          /* 2: 0.5rem → 0.4rem */
--mm-space-2\.5: 0.5rem;       /* 2.5: 0.625rem → 0.5rem */
--mm-space-3: 0.6rem;          /* 3: 0.75rem → 0.6rem */
--mm-space-4: 0.8rem;          /* 4: 1rem → 0.8rem */
--mm-space-5: 1rem;            /* 5: 1.25rem → 1rem */
--mm-space-6: 1.2rem;          /* 6: 1.5rem → 1.2rem */
--mm-space-8: 1.6rem;          /* 8: 2rem → 1.6rem */
--mm-space-10: 2rem;           /* 10: 2.5rem → 2rem */
--mm-space-16: 3.2rem;         /* 16: 4rem → 3.2rem */

/* Heights (Tailwind * 0.8) */
--mm-h-8: 1.6rem;      /* h-8: 2rem → 1.6rem */
--mm-h-9: 1.8rem;      /* h-9: 2.25rem → 1.8rem */
--mm-h-10: 2rem;       /* h-10: 2.5rem → 2rem */

/* Widths (Tailwind * 0.8) */
--mm-w-8: 1.6rem;      /* w-8: 2rem → 1.6rem */
--mm-w-9: 1.8rem;      /* w-9: 2.25rem → 1.8rem */
--mm-w-10: 2rem;       /* w-10: 2.5rem → 2rem */
--mm-min-w-10: 2rem;   /* min-w-10: 2.5rem → 2rem */

/* Container widths (Tailwind * 0.8) — replace hardcoded values in utilities below */
```

## Fix for container-width utilities:

Replace all `.mm-max-w-*` utility classes with the correct 0.8× scaled values:

```css
.mm-max-w-md { max-width: 22.4rem; }      /* 28rem * 0.8 = 22.4rem */
.mm-max-w-lg { max-width: 25.6rem; }      /* 32rem * 0.8 = 25.6rem */
.mm-max-w-xl { max-width: 28.8rem; }      /* 36rem * 0.8 = 28.8rem */
.mm-max-w-2xl { max-width: 33.6rem; }     /* 42rem * 0.8 = 33.6rem */
.mm-max-w-3xl { max-width: 38.4rem; }     /* 48rem * 0.8 = 38.4rem */
.mm-max-w-4xl { max-width: 44.8rem; }     /* 56rem * 0.8 = 44.8rem */
.mm-max-w-5xl { max-width: 51.2rem; }     /* 64rem * 0.8 = 51.2rem */
.mm-max-w-6xl { max-width: 57.6rem; }     /* 72rem * 0.8 = 57.6rem */
.mm-max-w-7xl { max-width: 64rem; }       /* 80rem * 0.8 = 64rem */
```

## Fix remaining unconverted classes:

### GeneratePlanButton.vue
Replace in button and overlay: `p-4` → `mm-p-4`, `px-4 py-2 gap-3` → `mm-px-4 mm-py-2 mm-gap-3`

### ScheduleStrip.vue  
Replace: `pb-2` → `mm-pb-2`, `p-1` → `mm-p-1`

### RecipeSwapControls.vue
Replace in swap button: `gap-2` → `mm-gap-2`

### RecipeDetailModal.vue
Replace in modal content area: `max-w-6xl` → `mm-max-w-6xl`

## Verification
Run `npm run lint && npm run build` after changes. Both must pass cleanly.
