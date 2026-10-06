# Task-first MealMind UI revision

## Approval and scope

The human requested changes on PR #64 in review 5421793010, against head `ad5ec241fbb037218da4489577935fd434626e7a`. The concern is information architecture, not tokenization or code-level cleanup. On 2026-10-05 the human approved the task-first direction proposed in chat and instructed us to proceed. That approves the design direction only: the PR remains unapproved and must not merge until new current-head AI and human approval gates pass.

This document specifies that direction for written design review before implementation planning. It is not a claim that the revision has been implemented or verified.

## Goal

Replace inherited vertical panel stacks with task-first workspaces. Preserve every existing workflow and API behavior. Existing content is a requirement; existing grouping, headings, and layout are not constraints.

## Global constraints

- Presentation-only changes in `apps/web`, relevant frontend tests, and focused documentation; no API, DTO, database, or provider behavior changes.
- No new dependencies, generic workspace framework, settings persistence model, or navigation destinations.
- Reuse semantic tokens, `mm-*` utilities, Lucide icons, Vue components, Pinia stores, and same-origin proxies.
- Preserve light/dark themes, reduced motion, visible `.focus-ring` states, accessible names, live feedback, and practical 44px touch targets.
- Preserve URL-backed week/view navigation and route-backed recipe dialog history, focus restoration, dismissal, and scroll locking.
- Use the local deterministic mock for stateful browser verification. Home-server browser verification remains read-only.
- Never run local Docker. Rebuild home-server `web` before final live browser verification. Preserve all user data and `pg_data`.
- Only one active llama.cpp subagent at a time, including scouts, implementers, reviewers, and resumed follow-ups.
- Continue the existing related PR branch; preserve unrelated `.omp/` and user changes. No merge or auto-merge without the required approvals.

## Chosen architecture

Keep the existing shell and three primary destinations: Plan, Recipes, Settings. Shopping remains a view of the selected week. Reorganize each destination around its primary task, not around its existing component stack.

CSS grid and ordinary Vue conditional rendering provide responsive presentation. Local selection state may change which presentation is visible, but must not create a second plan model or duplicate mutation logic. Delete obsolete presentation components after all callers move; no compatibility wrappers.

Alternatives considered: a smaller rearrangement of current panels would retain the rejected hierarchy; a wizard would add navigation steps to already-working workflows. Neither is selected.

## Weekly workspace

### Shared toolbar

Show the human-readable week once. Integrate week navigation, compact plan state/source, Plan/Shopping view links, and the actions valid for the current view and plan lifecycle. Controls may wrap into two compact rows; this is one contextual toolbar, not a sequence of bordered panels. Keep timezone context subordinate but available.

Remove the standalone `PlanSummary` panel after moving its useful state/source information into the toolbar. Preserve explicit Locked/Editable information. Do not show generate/commit controls in the wrong lifecycle or shopping view.

### Editable plan: schedule plus contextual work area

At desktop width the schedule is the primary left-hand workspace. The selected meal editor and recipe chooser form the right-hand contextual work area. The editor shows day, slot, servings, current recipe, save, AI pick, and remove actions; recipe search and existing tag filters appear immediately below. Selecting another meal or Add meal switches this work area without scrolling past the entire week.

The schedule remains a compact seven-day overview with existing meal selection, add, and skip-day controls. Each day's state is legible without large empty image blocks or nested decorative panels. Do not reduce available meal information to unlabeled chips.

At narrow widths, selecting a day makes that day's schedule and contextual editor/chooser adjacent in document order. A horizontally scrollable, labeled day selector is permitted; the page itself must not overflow. All days remain reachable, selected-day state is announced, and editing is not placed after seven full-height day panels. Keep selected-day presentation local; existing week/view URL behavior is unchanged.

Use the existing draft workflow, event handlers, default portions, and pending/error states. The layout must not lose unsaved form state merely because the viewport changes.

### Committed plan

The full-week overview remains the main content. For the current committed week, Today's meals is a compact contextual area beside the overview on desktop and before it on mobile. Done/Skipped adherence actions remain available there; the overview is read-only. Outside the current week, omit the today area rather than leaving an empty column.

Retain no-plan, invalid-recipe, loading, and error states. Preserve current/future/past week rules, Generate/Blank availability, draft Commit/Regenerate availability, and committed read-only behavior.

### Source ownership

`pages/plan.vue` owns toolbar and lifecycle placement. `components/plan/SelectionWorkspace.vue` owns selected-meal editing and contextual recipe selection. `ScheduleStrip.vue` owns schedule/day selection presentation. `LockedWeek.vue` and `TodayMeals.vue` render committed overview and adherence actions. `PlanSummary.vue` becomes obsolete after complete cutover.

## Recipe library and detail

### Library

Lead with the library title/count and search, followed directly by recipe results. Existing client-side title/description/tag filtering remains unchanged. Invalid recipe information remains discoverable near the collection controls.

Place an explicit Import recipe disclosure in the library toolbar. Its expanded content contains the existing labeled Recipe URL field, Import action, validation/error output, progress, result link, and recent imports. Prefer native disclosure semantics over introducing another route-backed modal. On submission, keep the disclosure open while the job is active; job feedback must not disappear because the user changes search or viewport. After completion, keep the result visible until the user closes the disclosure. Existing import polling and refresh logic remain authoritative.

Cards remain scan-friendly and open the existing recipe dialog. Do not add filters, sorting behavior, favorites, or bulk actions.

### Detail

Retain ingredients and instructions side-by-side where space permits, stacked on mobile. Put recipe identity and portions before a large image in narrow layouts, cap image height, and preserve meaningful fallback rendering. Remove redundant decorative eyebrows but retain semantic Ingredients/Instructions headings. Keep servings quantity refresh, loading/errors, and both direct-page and dialog behavior.

### Source ownership

`pages/recipes/index.vue` owns library hierarchy/disclosure placement. `ImportRecipeForm.vue` keeps its existing job logic while losing the dominant always-open panel treatment. `RecipeDetails.vue`, `IngredientList.vue`, and `InstructionList.vue` own the simplified cooking view.

## Shopping

Make the category checklist the primary surface. A compact checklist toolbar combines remaining/completed counts, percentage, accessible completion progress, and Regenerate when allowed. Remove the standalone Shopping progress panel; do not remove the progressbar or regeneration behavior.

Keep category grouping, quantities, source information, checked state, request pending states, and errors. Categories may use two columns on wide screens and one on narrow screens. Do not reorder completed items or introduce hidden-completed behavior: this revision changes presentation, not checklist semantics.

Keep list generation and no-list/no-plan states in the weekly workspace. Committed plans retain their existing regeneration restriction.

`components/shopping/ShoppingList.vue` owns this toolbar and category layout; existing category components and store mutations remain authoritative.

## Settings

Organize settings into two semantic areas rather than five equally weighted panels:

1. Provider connection: endpoint, key controls/notices, model, and contextual Load models feedback.
2. Household planning: timezone, default servings, weekly meals, meal preferences/variety, automation, and pantry staples.

At desktop width use a narrower provider area beside the broader household form. At narrow widths provider precedes household settings. Group related fields with headings or fieldsets rather than wrapping every small subsection in another card. Keep appearance as a compact labeled control in the page toolbar, not the first full-width panel.

Use one existing form model and one Save operation. Keep Save and its live status in a persistently reachable action area. Prefer sticky placement within the page layout, not a viewport overlay that covers fields, dialogs, or the mobile keyboard. The action area must reserve space, respect safe-area insets, and wrap errors without clipping.

Load models belongs beside the model field. Preserve all endpoint normalization and key semantics, authentication status, password input behavior, plaintext-storage notice, model suggestions, validation, disabled/pending states, and save errors. Do not split persistence into per-section saves. Appearance keeps its existing independent persistence behavior.

`pages/settings.vue`, `SettingsForm.vue`, and `ConnectionFields.vue` own the hierarchy and contextual actions. Other existing field components are reused.

## Acceptance and verification

- Editable-week users can select a meal, change recipe/portions/day/slot, add/remove meals, and skip a day through the contextual work area; draft commit and regeneration still work.
- At mobile width the selected-day editor is adjacent to that day's content, not below all seven day panels.
- Current committed-week users can record Done/Skipped; past/future committed plans remain read-only with no inappropriate adherence controls.
- Week and Plan/Shopping navigation preserve URL state, refresh behavior, and dialog history.
- Library results and search precede secondary import content. Import success/failure/progress and catalog refresh remain functional.
- Shopping checked state persists and quantities/categories remain intact; progress and allowed regeneration remain accessible.
- Settings changes save through the existing single operation. Load models is contextual; saved-key reuse/removal and changed-endpoint behavior remain intact; no secret is exposed.
- Direct and dialog recipe views preserve portions refresh, Escape/back dismissal, focus restoration, and body-scroll locking.
- Existing user-visible error/empty/loading states remain accessible. Remove obsolete wording/layout assertions rather than preserving incidental old headings.
- Run `npm run test:web`, `npm run test:e2e:web`, `npm run lint`, and `npm run build` after integration. Extend existing deterministic workflow tests only for plausible regressions introduced by the reorganization.
- Inspect actual mock screens at 390px, 768px, and 1440px in light/dark themes, including draft, committed, empty/error, import-in-progress, settings feedback, and recipe-dialog states. Confirm no page overflow, clipped controls, or sticky-action obstruction.
- Rebuild and recreate home-server `web`, inspect Compose/health/HTTP state, then perform read-only desktop/mobile browser verification. Capture new mock-only screenshots on the final revision head for PR review.
- Obtain fresh independent AI review and a human approving GitHub review for the new head. The human's design-direction approval does not satisfy the PR merge gate.
