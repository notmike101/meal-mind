# MealMind UI Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Tasks execute serially; skip build/lint/tests/formatters mid-flight, controller runs verification after each implementation handoff.

**Goal:** Fulfil #48 and all six children (#58–#63) with the approved neutral-stone/warm-accent dashboard design.

**Architecture:** Existing Vue/Nuxt components and native dialogs remain. One structured JSON token source feeds build-time CSS generation, Tailwind variables, DESIGN.md documentation and component metadata. Shared shell and section patterns unify all real surfaces without altering stores/API contracts.

**Tech Stack:** Nuxt 4.5, Vue 3, Tailwind 3, TypeScript, native JSON/Node filesystem, existing Vitest/Playwright.

**Spec:** docs/superpowers/specs/2026-10-03-ui-modernization-design.md (user approved).

## Global Constraints

- Approved visual direction: neutral stone surfaces with a warm accent; no green-heavy surfaces.
- No new runtime UI dependency, no external design service required, no client token parser.
- Preserve Plan / Recipes / Settings navigation, all URL/history contracts and all workflows.
- Preserve native dialog focus, Escape/backdrop dismissal, restoration and scroll locking.
- Normal text contrast >=4.5:1; large text/control indicators >=3:1; practical controls >=44px.
- No local Docker; mock ports3100/3199 only. Preserve recipes, secrets, pg_data and unrelated changes.
- Tokens own colors, spacing, typography, radii, shadows, shell sizing and motion. Existing mm-* utilities remain usable; do not keep a second independent scale.
- No mock-echo/source-text/style-class tests. Browser evidence proves visual behavior.

## Task 1: Structured design foundation and warm palette

**Files:** Create apps/web/design/tokens.json, apps/web/design/components.json, apps/web/design/generate-tokens.ts; modify apps/web/nuxt.config.ts, apps/web/tailwind.config.ts, apps/web/app/assets/css/main.css. Create DESIGN.md. Parent owns research document separately.

**Consumes:** Existing RGB-triplet CSS variables and mm-* utility contract from main.css; Nuxt initialization.
**Produces:** JSON tokens with types/descriptions; generateDesignTokens() build function; generated ignored CSS path added before main.css in Nuxt css list; stable existing semantic names plus status/muted/control tokens; component metadata mapped to real Vue/CSS patterns.

- [ ] Define light/dark neutral stone palette. Start with light canvas #f7f6f3, surface #ffffff, field #efede8, ink #292524, steel #57534e, strong #9a3412, strong-foreground #ffffff, moss #9a3412, tomato #b91c1c; dark canvas #171614, surface #211f1c, field #2c2925, ink #faf8f5, steel #c4bdb3, strong #fdba74, strong-foreground #292017, moss #fdba74, tomato #fca5a5. Choose borders, rail, tertiary, success/warning and hover roles by measured contrast rather than alpha hacks. Preserve existing names for callers, document legacy moss naming as interaction role, not green hue.
- [ ] Represent each token with $type, $value, $description and explicit theme grouping; dimensions use units and color data maps deterministically to RGB-triplet CSS. Include component relationships in components.json; validate references at generation, reject unknown type/malformed token data. This is a fixed repository format, not a generic token framework.
- [ ] Build generation uses Node fs/url only. Integrate generation in Nuxt config initialization so dev/build/prepare receive CSS, with output in .nuxt and no tracked generated artifact. Equivalent outline:
```ts
import { generateDesignTokens } from './design/generate-tokens';
const tokenCss = generateDesignTokens();
export default defineNuxtConfig({ css: [tokenCss, '~/assets/css/main.css'] });
```
- [ ] Remove duplicate handwritten declarations from main.css; generated :root light, explicit dark and prefers-color-scheme fallback must preserve pre-hydration behavior. Tailwind sizing/color/shadow/radius/font mappings read CSS variables from the same source. Shared styles use token variables; remove low-opacity text/focus hacks and tinted glows. Define consistent button, field, panel, card, nav and dialog treatments, default/hover/focus/active/disabled/error/busy states as applicable.
- [ ] DESIGN.md documents intent, token hierarchy, theme mapping, exact component contracts/props/slots/events, examples, metadata paths, build behavior, agent read/edit/verify workflow and extension rules. Use Google's source-readable Stitch model, not a claim that hosted Stitch is an open-source Vue library.
- [ ] Controller runs Nuxt build and real mock SSR/token usage; throwaway check edits temporary token input and proves generated style affects rendered computed colors, restores source. Only keep permanent tests for malformed token rejection or contrast invariants if useful.

## Task 2: Shared shell and complete consistency/layout cutover

**Files:** Create apps/web/app/components/AppShell.vue and a reusable SectionPanel.vue if needed. Modify layouts/default.vue, layouts/wide.vue, components/AppHeader.vue, PageHeading.vue; pages/plan.vue, recipes/index.vue, settings.vue; all live components in plan/, recipes/, shopping/, settings/ whose styles conflict with tokens/patterns. Recipe detail route continues using shared RecipeDetails. Do not modify stores/workflow logic. Redirect-only index.vue/shopping.vue intentionally unchanged.

**Consumes:** Task1 semantic variables and documented component pattern contract.
**Produces:** Consistent real routes, reusable shell/section APIs and documented layout wireframe in DESIGN.md.

- [ ] Implement shell with named main anchor and skip link. Both named layouts delegate to it. Navigation stays three links, desktop rail ~224px, mobile visible top navigation, one gutter scale, bounded readable content width. Expose only genuinely consumed slots/props.
```vue
<template>
  <AppShell><slot /></AppShell>
</template>
```
- [ ] PageHeading uses one tokenized title scale. RecipeDetails uses same hierarchy. SectionPanel handles shared heading/help/body pattern for settings, shopping, today/editor sections where appropriate. Consistent spacing, control sizing and card treatment; replace raw color/size literals with tokens/utilities and semantic muted/status roles. Keep all props/events and accessible labels.
- [ ] Weekly workspace orders header/week nav, tabs, status/actions, today, labeled schedule/editor. LockedWeek groups all seven dates in responsive grid, with explicit empty-date state; no isolated headings. Keep selected-week context and adherence on correct weeks. Editor retains add/edit/swap/skip/restore/filter/servings/commit flows.
- [ ] Recipes share compact header/import/search/grid rhythm; shopping progress/category/list use consistent panels; settings flatten nested decorative field cards and use meaningful section grouping. Both dialogs retain behavior; normalize visual surfaces/backdrop/sizing/touch targets. Long names and controls wrap without clipping.
- [ ] Remove obsolete style classes and truly unused in-scope UI code only; no unrelated refactoring. Fix dead moss-dark hover class through semantic hover token.
- [ ] Update DESIGN.md/component metadata for final APIs. Controller runs existing web unit tests, mock Playwright, lint/build once after handoff, then actual browser audit 390/768/1440 in both themes and modal/editor states.

## Task 3: Acceptance evidence and integration

**Files:** Parent creates docs/UI_MODERNIZATION.md research/audit/palette/contrast evidence, updates docs as exercised verification arrives, updates existing E2E only for uncertain consumer-visible responsive/theme/focus boundaries.

- [ ] Document five SaaS references with source links, concrete navigation/content/density/color patterns and MealMind interpretation; Stitch/Material/Petal/DTCG evaluation includes licensing/community/SSR/TypeScript/Tailwind/tooling and why chosen approach has no runtime bundle cost. Record old palette, new values and real measured contrast; no fabricated measurements.
- [ ] Exercise local mock all real routes, both themes, desktop/tablet/mobile, dialog and editor. Capture before/after visual evidence and check document overflow. Existing workflows are the regression gate; token metadata generation/import/build gets real smoke proof.
- [ ] Commit/push verified slices, open draft PR against main, request notmike101 review. Every milestone updates parent and relevant child tickets.
- [ ] Rebuild home-server web from verified branch: docker compose build web, up -d --no-deps --force-recreate --wait web. Check compose ps, API/MCP health, web HTTP and read-only browser responsive themes/routes. Never mutate integrated live planning data.
- [ ] Independent @REVIEWER subagent reviews full current-head PR and posts structured AI decision through GitHub App. Fix findings and reverify affected path. Mark ready only after gates; human current-head approving GitHub review required.
- [ ] Merge only with both explicit current-head approvals/checks. Verify GitHub merged state, resulting commit contained in origin/main, and all six children and parent closed. No version/tag release requested.
