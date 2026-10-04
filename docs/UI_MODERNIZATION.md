# UI modernization research and audit

Scope: parent #48; Stitch integration #58; color #59/#62; layout #60; consistency #61/#63. The user approved **neutral stone with a warm accent**, followed by the written design in `docs/superpowers/specs/2026-10-03-ui-modernization-design.md`. The implementation plan is `docs/superpowers/plans/2026-10-03-ui-modernization.md`.

## Five product references

These references inform principles, not a pixel-for-pixel clone. Public product documentation/screenshots are not claims of authenticated dashboard access. Values below are source examples, not a guarantee of every product's current app theme.

| Product and evidence | Color/readability strategy | Navigation, content and density | MealMind application |
| --- | --- | --- | --- |
| [Linear concepts and interface screenshot](https://linear.app/docs/conceptual-model), [features](https://linear.app/features) | Quiet near-black product presentation (features metadata `#08090a`); restrained accents leave grouped work/status visible. | Workspace/team context in left navigation, list/board views and named workflow groups; dense task content rather than oversized promotional panels. Mobile is a separately described product surface, not assumed identical desktop navigation. | Keep stable rail and meal/date grouping; compact headings and explicit status rather than colored decorative blocks. |
| [Vercel Geist colors](https://vercel.com/geist/colors) | Two background levels; steps1–3 component backgrounds,4–6 borders,7–8 high-contrast fills,9–10 accessible secondary/primary text. Gray plus semantic blue/red/amber/green scales; roles matter more than one brand tint. | The color documentation separates default/hover/active roles rather than styling every panel as a CTA. The reference itself uses navigation and a bounded documentation content region. Dashboard layout conclusions are not inferred from the marketing homepage. | Separate canvas/surface/field, text/control borders, and primary/status roles. Reuse the same state rules across pages. |
| [GitHub Primer functional colors](https://primer.style/product/primitives/color/), [Primer](https://primer.style/) | Light examples: foreground `#1f2328`, muted `#59636e`, accent `#0969da`, default surface `#ffffff`, inset `#f6f8fa`, border `#d1d9e0`; success and danger have their own roles. Documentation offers theme-specific tokens. | Clear sidebar/product navigation and grouped tables of functional roles; outlined controls and low-elevation surfaces. Large data surfaces are grouped structurally, not by saturated backgrounds. | Opaque secondary copy, explicit success/error text, modest borders/elevation. Preserve accessible link and status semantics. |
| [Notion sidebar navigation](https://www.notion.com/help/navigate-with-the-sidebar), [product imagery](https://www.notion.com/) | Neutral document surfaces and dark text in product imagery, small purposeful icon/status colors rather than dominant tinted canvases. Exact app RGB values not measured. | Left-hand sidebar, workspace switcher, search/home/library, expandable sections; sidebar can resize/collapse. Product screenshots keep working content central. | Three visible existing destinations, restrained rail and readable content width. Do not add workspace switching/collapsing complexity to a single-user planner. |
| [Stripe Dashboard basics](https://docs.stripe.com/dashboard/basics), [Stripe design reference](https://github.com/byadityaraj/designmd/blob/main/examples/DESIGN-stripe.md) | Secondary measured-reference examples identify deep navy `#0a2540`, purple `#635bff`, cool surface `#f6f9fc`; these are inspiration, not authenticated dashboard measurements. Primary docs establish actionable resource/status hierarchy. | Primary sidebar resource navigation, Home overview and important notifications, product sections, shortcuts and grouped settings. Docs separately explain mobile dashboard availability/support. | Put the selected week, actionable status and plan actions before detailed meals; group settings by purpose. No speculative analytics dashboard. |

### Color theory and food context

Neutral surfaces let recipe photography supply warmth and variety without tinting every surrounding panel. A warm action accent preserves MealMind's food context while retaining dashboard restraint. Saturation signals interaction, not a background theme. Color alone never communicates status: keep labels/icons for success, warning and destructive states. Surface lightness, headings and spacing carry hierarchy. Dark mode uses raised neutral surfaces, not inverted white cards or green-black casts.

[WCAG2.2 contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) requires normal text4.5:1, large text3:1; [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) covers indicators at3:1. Aim above those floors, including placeholders, hover text and focus outlines. Alpha foregrounds must be composited against their actual surface before measuring. Disabled controls are exempt, but should remain recognizable.

## Stitch and open-source alternatives

| Approach | Evidence / licensing / ecosystem | Compatibility and decision |
| --- | --- | --- |
| Stitch DESIGN.md approach | [Hosted overview](https://stitch.withgoogle.com/docs/design-md/overview/); [Google's public skills](https://github.com/google-labs-code/stitch-skills), Apache-2.0; [source-readable example](https://github.com/google-labs-code/stitch-skills/blob/main/plugins/stitch-design/skills/extract-design-md/examples/DESIGN.md); [Vue/Nuxt guidance](https://github.com/google-labs-code/stitch-skills/blob/main/plugins/stitch-design/skills/extract-design-md/references/vue.md). Public repo contains active skills/plugins and Vue extraction guidance. Hosted docs required JS and did not expose usable body text in this environment; the current official repository provided the concrete format/examples. | Adopt semantic brand/layout/component guidance plus machine-readable values and roles. DESIGN.md is documentation, not a Vue runtime. No hosted extraction calls, MCP setup or licensing assumptions required. Retains SSR and TypeScript component contracts. Do not claim the hosted Stitch service itself is open-source. |
| Material3 tokens / Material Web | [Token overview](https://m3.material.io/foundations/design-tokens/overview), [Material Web](https://github.com/material-components/material-web), Apache-2.0. Material Web README states maintenance mode pending maintainers. | Surface/on-surface and component/state roles are useful references. Full web-component adoption adds Lit/custom-element/SSR integration and styling migration without solving a missing MealMind workflow. Retain native Vue instead. |
| Petal Components | [Petal](https://petal.build/), [source](https://github.com/PetalFramework/petal_components), MIT; public schemas/MCP and component rules support agents. Current source targets Phoenix LiveView/HEEx and Tailwind4. | Good example of concrete component schemas and reusable patterns; not a Vue/Nuxt library and does not match MealMind Tailwind3. Do not install an incompatible stack. |
| DTCG Format2025.10 | [Stable format report](https://www.designtokens.org/TR/2025.10/format/), [community source](https://github.com/design-tokens/community-group). Open community specification under W3C community agreements; explicitly not a W3C Recommendation. Defines typed values, descriptions, groups and references. | Adopt typed/described structured tokens and documented component relationships with a fixed local mapping to CSS. No generic resolver or new token platform required. JSON is directly readable by tools/agents; generation is build-time Node code. |

### Integration and agent interface

The design files are local source artifacts: agents read `DESIGN.md`, `apps/web/design/tokens.json`, and `apps/web/design/components.json`. Token descriptions explain purpose; component metadata explains consumers/states and actual Vue/CSS contracts. Nuxt generates CSS before dev/build; Tailwind consumes variables. Theme selection still uses the existing pre-hydration script and Pinia preference store. No client JSON parser, hosted API, authentication or additional UI dependency.

When extending the UI: read component contracts, reuse a current pattern, choose semantic tokens, edit source tokens rather than generated CSS, validate contrast and responsive interaction through the mock, update metadata/guide, then rebuild the home-server web image before acceptance. Nuxt build-time code is TypeScript/Node only; rendered CSS/native Vue works under SSR. Bundles do not include the token generator or metadata as a runtime design service.

## Current-repository audit

Baseline inspected through the deterministic mock on Plan, Shopping, Recipes and Settings in dark mode, including390px shopping and1440px library/settings. Existing routes are `/plan?week=&view=`, `/recipes`, `/recipes/:recipeId`, `/settings`; `/` and `/shopping` redirect into the weekly workspace. No separate dashboard is needed.

| Evidence | Problem | Chosen correction |
| --- | --- | --- |
| `layouts/default.vue` vs `wide.vue`: different max widths82rem/94rem and breakpoint gutter rules | Major pages have different rhythm and shell ownership duplicated | Shared AppShell and common responsive spacing; keep named layouts for modal origins |
| `PageHeading.vue`, `RecipeDetails.vue`, CSS display token, editor heading | Four independent heading scales | One tokenized display hierarchy |
| `main.css .mm-panel` vs raw `rounded-2xl border-line/25 shadow-sm` in settings/today/shopping/recipe sections | Competing radii, faint borders and elevation | Shared tokenized panel/card/section patterns |
| CSS light/dark/system-dark token blocks | Duplicated palette can drift | One JSON source generates all selectors |
| `text-ink/50`–`/60` global override and alpha-muted copy | Supporting copy depends on hidden contrast patch | Opaque semantic secondary/tertiary colors |
| `.focus-ring` moss at0.3 opacity | Baseline dark rail contrast measured **2.0011:1**, below3:1 | Opaque indicator color appropriate to actual surface |
| `.mm-field::placeholder` steel at0.72 opacity | Readability depends on compositing/surface | Opaque supporting token |
| Large title/date block, today card, disconnected locked-date headings | Weekly structure consumes space without clear grouping | Compact header/action hierarchy and responsive date groups |
| Settings nested field cards | Containers compete with labels/input groups | Flatter consistent section layout |
| Mixed mm-* and raw Tailwind sizes; hard-coded heading clamps | Two independently authored styling vocabularies | Both utilities consume one token scale, prefer shared patterns |
| `ImportRecipeForm.vue hover:text-moss-dark` | Missing Tailwind color silently disables hover treatment | Semantic interaction hover token |
| Practical44px targets expressed several ways | Sizing consistency difficult to audit | Shared control sizing tokens/utilities |

## Old palette reference

RGB triplets before modernization:

| Token | Light | Dark |
| --- | --- | --- |
| canvas |244 247 245|13 19 16|
| surface |255 255 255|22 30 26|
| field |238 243 240|31 42 36|
| ink |20 29 25|237 245 241|
| line |207 218 212|76 96 87|
| strong |20 103 76|91 205 162|
| strong-foreground |255 255 255|9 28 21|
| moss |22 112 82|105 218 175|
| tomato |184 58 43|255 137 111|
| steel |78 94 87|165 185 176|
| glow |164 226 201|52 104 83|
| warm |239 157 88|220 151 90|
| rail |16 31 26|8 14 12|
| rail-foreground |241 248 245|239 247 243|

Final token reference and component usage live in `DESIGN.md` and the structured source files. Verification results are recorded only after commands/browser scenarios are exercised, in the PR and ticket milestones.

## Token contrast and validation smoke

An isolated script imported the real token generator and source JSON, emitted the actual ignored CSS file, and exercised malformed color, unsafe token name, unknown component-token reference and mismatched theme-token rejection. All four invalid inputs were rejected. Changing a cloned canvas token to `#123456` emitted RGB18 52 86, demonstrating the mapping without altering source data.

The WCAG relative-luminance calculation checked82 intended foreground/background pairs. This is token-pair evidence, not a claim that every rendered page has already been audited.

| Minimum across intended pairs | Light | Dark |
| --- | --- | --- |
| Primary text on canvas/surface/field |12.965:1|13.653:1|
| Secondary text on canvas/surface/field |6.521:1|7.772:1|
| Tertiary/placeholder on canvas/surface/field |5.041:1|6.460:1|
| Interaction text on canvas/surface/field |6.245:1|8.582:1|
| Error text on canvas/surface/field |5.530:1|7.625:1|
| Success text on canvas/surface/field |6.094:1|10.307:1|
| Warning text on canvas/surface/field |5.856:1|11.621:1|
| Primary-action foreground on default/hover fill |7.307:1|9.482:1|
| Navigation secondary text on default/hover/active |4.740:1|6.017:1|
| Focus on canvas/surface/field/rail/rail-hover/rail-active |5.114:1|6.644:1|
| Control boundary on canvas/surface/field |3.582:1|5.160:1|

The web production build passed after correcting token-name validation for existing numeric scale keys and strict TypeScript indexing. In the actual mock browser, dark settings rendered canvas `rgb(23, 22, 20)`, text `rgb(250, 248, 245)`, field `rgb(44, 41, 37)` and apricot accent `253 186 116`. Temporarily changing the source dark canvas to `#181715` and restarting Nuxt changed the rendered body background to `rgb(24, 23, 21)`. The source was restored and its original CSS regenerated; the throwaway smoke script was removed. This proves build-time source consumption, not complete page/layout acceptance.

Before rebuilding, the existing home-server `/recipes` production navigation loaded404,305 encoded JavaScript bytes and39,306 CSS bytes (unique assets), with DOMContentLoaded207.4ms and load257.6ms on one workstation navigation. Timing is a single observation, not a benchmark; compare the same route after rebuild and report variability honestly.

## Cutover verification

The complete local gate passed: zero-warning ESLint, 179 unit tests, 41 web component tests, all workspace production builds, and 11 mocked Playwright workflows. The browser console assertion covers saved light/dark preferences across hard reloads, subsequent routes, and live system-theme changes without hydration errors.

Actual browser inspection covered locked/editable plans, shopping, recipes, settings, and recipe details at 390, 768, and 1440 pixels in both themes (36 route/width/theme combinations). The rendered-text audit found no contrast or document-overflow failures; minimum measured text contrast was 5.041:1. This is sampled rendered content, not a blanket accessibility certification.

Mobile stress used real client-store recipe/plan data with long unbroken names, tags and notes. Library cards, editor headings, tag filters and metadata wrapped without visible clipping or document overflow. The temporary client state was discarded by navigation; no live data or recipe files were changed.

Keyboard inspection verified the first Tab exposes the skip link and Enter focuses `main-content`. Both native dialogs retain body-scroll locking and restore opener focus after dismissal. Missing native `close()` calls before conditional removal caused focus to fall to the body; lifecycle ordering now closes the top layer before removal. Playwright covers recipe close, generation Cancel and generation Escape focus restoration.
