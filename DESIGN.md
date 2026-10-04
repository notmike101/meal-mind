# MealMind design system

## Direction and scope

MealMind is a meal-planning workspace, not a marketing page. Use neutral stone canvases and surfaces, terracotta actions in light mode, and apricot actions with dark text in dark mode. Recipe images supply visual variety. Keep Plan / Recipes / Settings navigation and the existing workflow/store contracts.

This document adopts the source-readable `DESIGN.md` approach promoted by Google's Stitch skills. It does **not** treat the hosted Stitch service as an open-source Vue component library. No hosted service, new UI dependency, remote font request, or client-side token parser participates in rendering.

The approved scope is in `docs/superpowers/specs/2026-10-03-ui-modernization-design.md`. Research and exercised acceptance evidence belong to `docs/UI_MODERNIZATION.md`.

## Sources of truth

| Source | Owns |
| --- | --- |
| `apps/web/design/tokens.json` | All numeric design scales, semantic colors, font stacks, radii, neutral shadows, shell widths, breakpoints and motion |
| `apps/web/design/components.json` | CSS/Vue pattern sources, token relationships, related patterns, interaction intent and existing component API descriptions |
| `apps/web/design/generate-tokens.ts` | Fixed-format validation and deterministic CSS generation |
| `apps/web/tailwind.config.ts` | Utility names mapped to those variables; intrinsic/viewport layout keywords, not a duplicate numeric scale |
| `apps/web/app/assets/css/main.css` | Existing `mm-*` utilities and shared native-element treatments |

Generated `apps/web/.nuxt/mealmind-design-tokens.css` is ignored output. Never edit or commit it. There is no second handwritten light/dark palette in `main.css`.

## Token format (version 1)

This is a small, fixed MealMind format inspired by DTCG's typed token records, **not** a full DTCG interchange implementation. It does not support token aliases, arbitrary nested groups, expressions or plugins.

```json
{
  "version": 1,
  "shared": {
    "spacing": {
      "4": {
        "$type": "dimension",
        "$value": { "value": 1, "unit": "rem" },
        "$description": "Four-pixel baseline spacing and element sizing: 4."
      }
    }
  },
  "themes": {
    "light": { "color": {}, "shadow": {} },
    "dark": { "color": {}, "shadow": {} }
  }
}
```

The excerpt illustrates records, not a complete valid file: every listed shared group and both complete themes are required. Every token has exactly `$type`, `$value`, `$description`; descriptions must be nonempty. Names use lower-case kebab-case, numeric scale keys (including decimals and size suffixes such as `2xl`), or `DEFAULT`.

| Fixed shared group | Type/value | Generated variable prefix |
| --- | --- | --- |
| `spacing` | `dimension`: `{value: number, unit: "rem"}` in current data | `--mm-space-` |
| `fontSize` | `dimension` | `--mm-text-` |
| `fontFamily` | `fontFamily`: nonempty array of safe local font-family names | `--mm-font-` |
| `fontWeight` | `number`: integer 1–1000 | `--mm-weight-` |
| `lineHeight` | `number`: positive unitless multiplier | `--mm-leading-` |
| `lineSize` | `dimension`: fixed line-height length | `--mm-leading-` |
| `letterSpacing` | `dimension`: signed `em` length | `--mm-tracking-` |
| `radius` | `dimension` | `--mm-radius-` |
| `width` | `dimension`: content/shell/rail/dialog widths | `--mm-max-w-` |
| `height` | `dimension`: `control` minimum target | `--mm-h-` |
| `borderWidth` | `dimension`: border and focus outline widths | `--mm-border-` |
| `duration` | `duration`: nonnegative `{value: number, unit: "ms"}` | `--mm-duration-` |
| `easing` | `cubicBezier`: four finite numbers, x coordinates in [0,1] | `--mm-ease-` |
| `opacity` | `number`: [0,1], currently dialog backdrop only | `--mm-opacity-` |
| `motionDistance` | `dimension`: page/dialog entry translation | `--mm-motion-` |
| `breakpoint` | `dimension`: current breakpoint lengths in px | `--mm-breakpoint-` |

Dimensions accept explicit length units; negative values are reserved for letter spacing. Decimal keys are escaped in CSS identifiers: `shared.spacing.2.5` emits `--mm-space-2\.5`. Tailwind handles the same escaping. Existing `--mm-h-8/9/10`, `--mm-w-8/9/10` and `--mm-min-w-10` remain aliases of the single spacing scale, not independently editable values.

Each theme has exactly `color` and `shadow`, with matching token names in light and dark:

- `color` uses `$type: "color"` and six-digit hex `$value`. Generation produces RGB triplets, e.g. `#9a3412` → `--strong: 154 52 18`. Use `rgb(var(--strong))` in CSS. Tailwind uses `rgb(var(--strong) / <alpha-value>)`, so existing alpha utilities remain syntactically compatible.
- `shadow` uses `$type: "shadow"` and an array of `{x, y, blur, spread, color, alpha}`. Lengths are explicit dimension objects, color is six-digit hex, alpha is [0,1], and blur is nonnegative. Current shadows use neutral black, never accent-tinted glows. Generated variables are `--mm-shadow-*`.

The generator rejects missing/extra fields and groups, wrong versions/types, invalid names, malformed values, mismatched theme names, duplicate CSS variables, unknown metadata token/relationship references, and missing metadata source files. It is structural validation, not a contrast checker or Vue API parser.

## Theme mapping and color roles

Generated CSS establishes light defaults on `:root`, explicitly writes the light palette for `:root[data-theme="light"]`, and writes dark values for `:root[data-theme="dark"]`. `prefers-color-scheme: dark` supplies dark values only when `data-theme` is absent. This preserves pre-hydration/system preference behavior without JS-dependent palette loading. Shared dimensions/fonts inherit into teleported dialogs.

| Role | Light | Dark | Usage |
| --- | --- | --- | --- |
| `canvas` | `#f7f6f3` | `#171614` | Application background |
| `surface` | `#ffffff` | `#211f1c` | Cards, panels and secondary actions |
| `field` | `#efede8` | `#2c2925` | Native fields, secondary hover |
| `ink` | `#292524` | `#faf8f5` | Primary text |
| `steel` | `#57534e` | `#c4bdb3` | Opaque secondary text |
| `muted` | `#6b635b` | `#b5aca0` | Opaque tertiary text and placeholders |
| `strong` / `moss` | `#9a3412` | `#fdba74` | Action and interactive accent |
| `strong-foreground` | `#ffffff` | `#292017` | Text on accent-filled controls |
| `strong-hover` / `accent-hover` | `#7c2d12` | `#fed7aa` | Filled-action / interactive-text hover |
| `focus` | `#9a3412` | `#fdba74` | Opaque focus outline |
| `control` | `#857a6f` | `#a3998b` | Visible field/secondary-action boundary |
| `line` | `#d6d1c9` | `#49433c` | Decorative separators only |
| `rail` | `#eeebe5` | `#1c1a17` | Neutral navigation surface |
| `rail-foreground` | `#292524` | `#faf8f5` | Rail primary text |
| `rail-muted` | `#625a51` | `#c4bdb3` | Rail supporting text |
| `tomato` | `#b91c1c` | `#fca5a5` | Destructive/error text |
| `success` | `#166534` | `#86efac` | Success only |
| `warning` | `#854d0e` | `#fde68a` | Attention/warning only |

`moss` is a legacy **interaction role**, not a green hue and not a success role. `white` and `black` are fixed literal asset colors, not substitutes for semantic foregrounds. Never use `text-white` on a dark-mode apricot action.

Use `text-steel` / `.mm-text-secondary` for supporting copy and `text-muted` / `.mm-text-muted` for tertiary copy. Do not fade text, placeholders, focus outlines or essential control boundaries with opacity. Decorative separators can use `line`; a separator does not establish a field boundary. Native controls use `control` instead.

Normal text must reach 4.5:1 and large text/control/focus indicators 3:1, including placeholders and hover states. Focus must be checked on canvas, surface, field and rail. These are acceptance requirements; final measured results belong in the research/audit document, not implied by this table.

## Component patterns and interaction contracts

No wrapper button/field/card framework was added. Use native elements with existing CSS classes and retain labels, described errors, links and events. The pattern metadata includes default, hover, focus, active, disabled, error and busy intent where applicable.

| Pattern | Contract |
| --- | --- |
| `.mm-button-primary` | Minimum `height.control` (2.75rem), accent fill and semantic foreground, neutral button shadow, opaque `strong-hover` for hover/active; no translation, scaling or colored glow |
| `.mm-button-secondary` | Same target/radius; surface/ink/control boundary, field/focus-colored hover/active |
| Button disabled | Native `disabled`; field background, opaque muted text and control boundary; no global opacity fade; no repeat request |
| Button busy | Existing component owns label/spinner/status and disables as appropriate; style does not invent request state |
| `.focus-ring` | Opaque focus token outline with tokenized width/offset; shared buttons also receive it directly on `:focus-visible` |
| `.mm-field` | Native labelled input/select/textarea; field fill, ink value, opaque muted placeholder, control border; hover/focus uses focus token; focus has an opaque outline |
| Field error | `aria-invalid="true"` gives a tomato boundary; caller supplies an associated error message and keeps the value |
| `.mm-panel` | Neutral section surface, decorative line boundary, token radius and panel shadow; caller supplies heading, padding and layout |
| `.mm-card` | Neutral card surface/radius/shadow; optional `.mm-interactive` only for actual interactive content |
| `.mm-interactive` | Hover changes boundary/elevation without moving the content; focus belongs on the real link/button |
| `.mm-nav-item` | Native navigation link with opaque rail-muted text, rail-hover state, `aria-current="page"` active surface/weight; add `.focus-ring` |
| `dialog` / `::backdrop` | Neutral native-dialog surface and scrim, tokenized entry motion; existing components own modal lifecycle |

Preserve native `showModal()`, focus trapping, Escape/backdrop dismissal, trigger restoration, body-scroll locking and route history. Styling must not replace those mechanisms. Reduced-motion media rules shorten transition/animation durations using the JSON reduced duration and prevent repeated animation.

The four-pixel baseline is `shared.spacing`. Use the same Tailwind spacing and `mm-p-*`, `mm-gap-*`, `mm-space-y-*`, `mm-text-*`, `mm-leading-*` contracts; there is no second scale. `height.control` is 44px at the default 16px root font size and scales with user font preferences. `width.rail` is 14rem (224px at that root size), `width.shell` is 86rem, and responsive breakpoints come from the JSON. CSS uses Tailwind's `@screen lg` instead of a duplicate breakpoint literal.

### Existing Vue APIs represented in metadata

All components below have **no public slots**. CSS/native patterns have no Vue props/slots/emits. No existing Vue API changed in this foundation step.

| Component (under `apps/web/app/components/`) | Props | Emits |
| --- | --- | --- |
| `PageHeading.vue` | Required `eyebrow: string`, `title: string`, `description: string` | None |
| `AppHeader.vue` | None; route-derived Plan/Recipes/Settings navigation | None |
| `recipes/RecipeCard.vue` | Required `recipe: RecipeSummaryDto` | `openDetails(recipeId: string, trigger: HTMLElement)` |
| `recipes/RecipeDetails.vue` | Required `recipe: RecipeDto`, `servings: number`; optional `disabled=false`, `embedded=false`, `headingId?: string` | `updateServings(servings: number)` |
| `recipes/RecipeDetailModal.vue` | Required `recipeId: string`, `servings: number` | None; closes through existing modal composable |
| `plan/GeneratePlanButton.vue` | Required `weekStart: string`; optional `replaceExisting=false`, `label?: string`, `defaultMealCount=14` | None; existing planning store owns writes |
| `recipes/ImportRecipeForm.vue` | Required `job: RecipeImportJobDto \| null`; optional `busy=false`, `recentJobs=[]`, `requestError=null` | `submit(url: string)`, `viewRecipe(event: MouseEvent, recipeId: string)` |
| `plan/ServingsStepper.vue` | Required `servings: number`, `disabled: boolean` | `update(servings: number)` |

### Usage

```vue
<PageHeading eyebrow="Recipe library" title="Recipes" description="Choose meals for your week." />
<section class="mm-panel mm-p-5 mm-space-y-4" aria-labelledby="section-title">
  <h2 id="section-title" class="mm-text-xl font-semibold">Import recipe</h2>
  <label for="recipe-url" class="mm-text-sm font-medium">Recipe URL</label>
  <input id="recipe-url" type="url" class="mm-field w-full mm-px-3 mm-py-2" />
  <button type="button" class="mm-button-primary focus-ring mm-px-4 mm-py-2">Import</button>
  <p class="text-steel mm-text-sm">Supporting copy remains opaque.</p>
</section>
```

In a real form, wire the existing submit/store flow rather than copying this illustrative markup as a new workflow.

## Metadata interface for agents

`components.json` has `{version: 1, components: {...}}`. Each pattern has exactly:

- `description`: intent;
- `sources`: existing repository-relative `app/...vue` or `app/...css` files;
- `selectors`: CSS selectors, empty for Vue records;
- `tokens`: references such as `shared.spacing.4`, `color.strong`, `shadow.panel`;
- `states`: state-name → behavior text;
- `related`: other keys in the same components map;
- `api`: `{props: {name: "type/default/intent"}, slots: [...], events: {name: "typed payload/intent"}}`.

`color.*` and `shadow.*` references resolve against **both** themes; a full `themes.light.color.strong` reference is also accepted. `shared.*` references address one fixed group/key. This is direct membership validation, not an alias resolver. Sources must exist; relationships must name another pattern. API/selector text is descriptive, not automatically extracted from Vue, so edit it with the source API.

## Build and edit workflow

1. Read this document, `tokens.json`, the relevant metadata record, and the real consuming component before editing.
2. Change values in JSON only. Preserve semantic names and existing `mm-*` names. Use a role before adding another color or dimension.
3. If adding a token, supply its type/value/intent in both themes where themed, then reference it from applicable metadata. Tailwind maps token-group keys automatically. Shared groups themselves are fixed; changing the format requires changing the generator and this document together.
4. If changing a public component API or introducing an actually needed shared component, update its metadata and this document in the same change. Do not invent slots/emits or add wrappers for future callers.
5. Restart Nuxt after editing JSON. `generateDesignTokens(): string` synchronously reads the two fixed JSON files, validates them, writes ignored CSS only when content differs, and returns its normalized absolute CSS path. Configuration adds it **before** `main.css`. A `build:before` hook regenerates it after the Nuxt CLI clears `.nuxt`, including `nuxt prepare`.
6. For data validation without filesystem writes, use `renderDesignTokens(tokens: unknown, metadata: unknown): string`. It validates records and metadata references and returns deterministic CSS. Filesystem existence checks belong to `generateDesignTokens()`.
7. The controller verifies using `npm run test:web`, `npm run test:e2e:web`, `npm run lint`, and `npm run build`; local browser work uses only the 3100/3199 mock workflow. Check 390/768/1440 widths, both themes, fields/focus, both dialogs and the editor. Rebuild the home-server web image before read-only integrated acceptance. Do not use local Docker or alter recipes/secrets/planning data.
8. For token provenance proof, temporarily change a token input, regenerate/restart, inspect the consuming element's computed style in the mock UI, and restore the source. Add durable tests only for plausible behavioral/invalid-input/contrast risks, not CSS source snapshots or class-string assertions.

## Foundation handoff status

The foundation implements JSON generation, source validation, CSS/Tailwind consumption and native shared styles. Page/component styling and the shared shell/section cutover are the next implementation task; existing page-local alpha text, hard-coded geometry and native-dialog utility overrides have not been migrated here. The metadata marks current Vue contracts, not hypothetical new shell APIs. Update these records and the layout documentation during that cutover.

No builds, tests, linters, formatters or browser checks were run by the foundation worker. The controller owns runtime, contrast and visual verification after handoff. Do not read this document as acceptance evidence.
