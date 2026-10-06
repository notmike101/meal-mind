# Task-first UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace inherited panel stacks with the approved task-first planner, library, shopping checklist, and settings layouts without changing workflows.

**Architecture:** Existing Vue components and stores remain authoritative. One integration owner performs the presentation cutover, including responsive CSS and consumer-visible regression coverage; the controller runs integration/browser/deployment gates after edits settle. All agents are serialized.

**Tech Stack:** Nuxt 4, Vue, Pinia, TypeScript, existing semantic CSS utilities, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-task-first-ui-design.md` (explicitly approved by the human).

## Global Constraints

- Presentation-only changes in `apps/web`, relevant frontend tests, and focused documentation; no API, DTO, database, or provider behavior changes.
- No new dependencies, generic workspace framework, settings persistence model, or navigation destinations.
- Reuse semantic tokens, `mm-*` utilities, Lucide icons, Vue components, Pinia stores, and same-origin proxies.
- Preserve light/dark themes, reduced motion, visible `.focus-ring` states, accessible names, live feedback, and practical 44px touch targets.
- Preserve URL-backed week/view navigation and route-backed recipe dialog history, focus restoration, dismissal, and scroll locking.
- Use the local deterministic mock for stateful browser verification. Home-server browser verification remains read-only.
- Never run local Docker. Rebuild home-server `web` before final live browser verification. Preserve all user data and `pg_data`.
- Only one active llama.cpp subagent at a time, including scouts, implementers, reviewers, and resumed follow-ups.
- Continue the existing related PR branch; preserve unrelated `.omp/` and user changes. No merge or auto-merge without the required approvals.

## Task 1: Integrated presentation cutover

**Files:**
- Modify `apps/web/app/pages/plan.vue`, `components/plan/SelectionWorkspace.vue`, `ScheduleStrip.vue`, `LockedWeek.vue`, `TodayMeals.vue`.
- Remove obsolete `components/plan/PlanSummary.vue` after moving state/source into the toolbar and removing every caller.
- Modify `apps/web/app/pages/recipes/index.vue`, `components/recipes/ImportRecipeForm.vue`, `RecipeDetails.vue`, `IngredientList.vue`, `InstructionList.vue`.
- Modify `apps/web/app/components/shopping/ShoppingList.vue`.
- Modify `apps/web/app/pages/settings.vue`, `components/settings/SettingsForm.vue`, `ConnectionFields.vue`.
- Modify `apps/web/app/assets/css/main.css` only for shared responsive presentation needed by these screens.
- Modify `DESIGN.md` and `apps/web/design/components.json` to remove obsolete sources and document changed presentation props/events/selectors.
- Modify existing relevant tests under `tests/e2e` and `apps/web/app`; inspect their existing setup and names first.

**Interfaces:** Preserve all existing props/events/store operations except minimal presentation-only day-selection props/events between SelectionWorkspace and ScheduleStrip. Parent SelectionWorkspace owns active day, meal, adding date, and editor state. No store/schema/API changes. Existing weekly-workspace/plan-workspace test roots remain usable. Existing component suffixes above are relative to `apps/web/app`.

- [ ] Read the approved spec and affected sources before editing. Trace current event handlers, import-job lifecycle, settings key semantics, and dialog history. Use LSP references before removing or changing exported interfaces when available.
- [ ] Add narrowly targeted consumer-visible regression checks to existing suites: mobile selecting another day exposes its editor without scrolling through seven full days; switching days selects a valid meal or exposes Add meal; viewport changes do not discard unsaved editor inputs; import feedback stays visible while work is active; settings Save remains reachable. Do not pin incidental old headings or duplicate already-covered workflow paths. Existing suite utilities and scenario resets are mandatory.
- [ ] Introduce parent-owned day selection from existing selection state. The data model is:

```ts
const selectedDate = ref(activeMeal.value?.date ?? addingDate.value ?? firstAvailableDate());
function selectDate(date: string) {
  selectedDate.value = date;
  const meal = availableMeals.value.find((item) => item.date === date);
  if (meal) selectMeal(meal.id);
  else if (!props.plan.skippedDates.includes(date)) beginAdd(date);
  else { activeMealId.value = ""; addingDate.value = null; }
}
```

Synchronize selectedDate on existing select/add/save/remove/skip and plan updates. Do not reset unsaved inputs on CSS viewport changes. Reuse existing mutation handlers; skipped days must still be restorable. If a day contains multiple meals, retain access to all of them.

- [ ] Put schedule and contextual editor/catalog into a CSS grid at desktop widths; mobile shows a labeled day selector and selected-day content adjacent to the editor. Use one component instance/model across breakpoints, not duplicated form trees. Keep visible selection and keyboard-operable labeled controls; narrow horizontal day navigation may scroll internally, never the page.

```css
.mm-plan-workspace { display: grid; min-width: 0; }
@media (min-width: 1024px) {
  .mm-plan-workspace { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
}
```

Use existing token names verified in main.css instead of introducing undefined variables. Consolidate weekly toolbar, lifecycle actions, and status. Place Today's meals beside the committed overview on desktop and before it on mobile; omit the secondary column when Today is absent.

- [ ] Move library search/results ahead of secondary import. Wrap the existing import workflow in an explicit native disclosure and keep it open during active work and after completion until the user closes it. Preserve validation/status/result/recent imports; do not unmount an active import job. Remove decorative eyebrows and constrain mobile recipe image prominence without altering dialog behavior.

```vue
<details class="mm-import-disclosure">
  <summary class="focus-ring">Import recipe</summary>
  <RecipesImportRecipeForm />
</details>
```

Use the actual existing component auto-import name and expose job-active state only if required for disclosure behavior; inspect the real lifecycle before choosing event names. Keep Recipe URL and Import accessible labels.

- [ ] Consolidate shopping progress/counts/regeneration into its checklist toolbar and preserve its progressbar, category contents, quantities, persisted checks, pending/errors, and locked regeneration restriction.
- [ ] Reorganize settings into provider and household areas. Put Load models by its field, appearance in the page toolbar, and the existing single Save plus live status in a sticky in-flow action area. Do not alter credential handling, form validation, normalized endpoint semantics, or persistence. Reserve action-area space and safe-area padding; ensure it never blocks the mobile keyboard or dialogs.
- [ ] Inspect the resulting diff for obsolete callers, inaccessible controls, lost loading/empty/error states, unnecessary abstractions, duplicated rendering/state, and unrequested workflow changes. Update focused UI documentation to describe the new hierarchy after browser smoke proof. Do not run checks mid-flight: the controller performs them once all edits settle.

## Task 2: Integration verification and review

**Files:** Existing mock tests and runtime configuration; no production API changes. Produce a verification report in session artifacts and record actual commands/results, not projected success.

**Interfaces:** Consumes Task 1's finished worktree. Produces a reviewed, verified revision commit and PR evidence; no merge authorization.

- [ ] Run `npm run test:web`, `npm run test:e2e:web`, `npm run lint`, and `npm run build`. Fix real failures at their cause, remove obsolete incidental-implementation assertions, and repeat only affected gates after corrections.
- [ ] Run `npm run dev:web:mock`. Inspect actual planner draft/current committed/future/past/no-plan/error states, library import progress/results, settings feedback, shopping progress, and recipe dialog. Inspect 390px/768px/1440px and light/dark themes; require rendered route/heading plus `html[data-mealmind-ready]`, no page overflow, accessible controls, adjacent mobile editor, and reachable sticky Save.
- [ ] Obtain a serialized task-scoped reviewer verdict covering both spec compliance and code quality. Provide the diff and actual verification evidence. Route substantive findings to one correction worker; re-review corrected paths.
- [ ] Run `git diff --check`, inspect status and intended diff, stage only explicit changed paths, commit and push to the existing PR branch. Never stage `.omp/`, runtime artifacts, recipes, or secrets.

## Task 3: Home-server gate and final PR evidence

**Interfaces:** Consumes the verified revision; deploys only affected web source to the existing home-server checkout, preserving unrelated changes/data. Produces final current-head screenshot/report evidence and independent AI review. Human approval remains external.

- [ ] Inspect the home-server checkout and runtime before synchronizing intended source. Rebuild only `web` for this web-only change, on `homelab-codex:/home/codex/meal-mind`:

```sh
docker compose build web
docker compose up -d --no-deps --force-recreate --wait web
docker compose ps
```

- [ ] Verify API/MCP health and web HTTP, then reload actual desktop/mobile affected routes in the Browser. Live interaction must be read-only; mutations remain mock-only. No volume reset or local Docker.
- [ ] Capture mock-only screenshots from final revision head and attach them to a follow-up PR comment. Report the structural changes, root cause of rejected hierarchy, exact verification, and any concrete blockers. Request human reviewer `notmike101` through GitHub requested_reviewers.
- [ ] Obtain fresh independent AI review using configured `@REVIEWER`, with disclosure, exact current head SHA, and the structured `docs/MERGE_GATE.md` format posted on the PR. Do not overlap another llama.cpp agent or wake an old agent during this review.
- [ ] Leave merge blocked until the human submits a current-head approving GitHub review; specification approval is not PR approval.

## Plan review

Task 1 owns all shared CSS and presentation interfaces; Tasks 2/3 consume its settled result and never race its edits. Library/import ownership remains one slice, avoiding an event-contract race. Settings changes preserve one model/save and key semantics. All approved spec screens, lifecycle states, mobile requirements, API invariants, local gates, home-server gate, screenshots, and current-head review requirements map to the three tasks above.
