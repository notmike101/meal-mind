# HelloQwen Implementation Plan

## Summary
HelloQwen is a local-only web application that replaces a meal-kit planning workflow for one user. It reads trusted Markdown recipes from disk, asks a local Qwen model running through LM Studio to curate the following Monday-Sunday lunch/dinner plan, lets the user adjust servings and swap meals before commitment, locks the plan when the week begins or when manually committed, generates a consolidated shopping list, and shows in-app daily accountability prompts.

Fixed decisions:

- Runtime: Next.js App Router, TypeScript, SQLite, Drizzle ORM, Tailwind CSS, lucide-react icons.
- AI endpoint: OpenAI-compatible LM Studio endpoint, default `http://127.0.0.1:1234/v1`.
- AI model: default `qwen3.6-35b-a3b`.
- Recipes: Markdown files under `recipes/`; no in-app recipe editor in v1.
- Week model: Monday-Sunday, lunch and dinner.
- Lock model: editable until manual commit or local Monday 00:00, then locked.
- Notifications: in-app reminders only.
- Portions: editable serving count per meal slot.
- Pantry: configured staple exclusions.
- Tracking: each active meal can be marked `planned`, `done`, or `skipped`.

## Architecture
Use a layered monolith inside one Next.js project.

- UI layer: React Server Components for initial page data; client components for serving controls, swap dialogs, checklists, settings forms, and reminder actions.
- API layer: Next.js route handlers under `src/app/api/**`; all inputs and outputs validated with Zod.
- Domain layer: pure TypeScript services for planning, week calculation, recipe parsing, portion scaling, shopping-list generation, lock enforcement, and adherence.
- Persistence layer: SQLite database at `data/helloqwen.sqlite`, accessed through Drizzle repositories.
- AI layer: OpenAI-compatible client wrapper with strict JSON prompts, Zod response validation, one retry on invalid output, and persisted AI event logs.
- Filesystem layer: Markdown recipes under `recipes/**/*.md`, parsed on demand and cached by file mtime.

Target structure:

```text
D:\projects\HelloQwen
  data/
    helloqwen.sqlite
  docs/
    HANDOFF.md
    IMPLEMENTATION_PLAN.md
    WORK_LOG.md
  recipes/
    example-*.md
  src/
    app/
      api/
      page.tsx
      plan/page.tsx
      shopping/page.tsx
      recipes/page.tsx
      settings/page.tsx
    components/
    db/
    lib/
      ai/
      domain/
      repositories/
      validation/
```

## Data Model
SQLite schema managed by Drizzle migrations.

### `settings`
- `id integer primary key`, fixed to `1`
- `timezone text not null default 'America/Chicago'`
- `ai_base_url text not null default 'http://127.0.0.1:1234/v1'`
- `ai_model text not null default 'qwen3.6-35b-a3b'`
- `planning_preferences text not null default ''`
- `planning_variety_rules text not null default 'Avoid repeating the same recipe in a week unless no alternatives exist.'`
- `default_lunch_servings integer not null default 1`
- `default_dinner_servings integer not null default 1`
- `created_at text not null`
- `updated_at text not null`

### `pantry_staples`
- `id integer primary key`
- `name text not null`
- `normalized_name text not null unique`
- Seed defaults: `salt`, `black pepper`, `water`, `olive oil`, `vegetable oil`, `sugar`.

### `meal_plans`
- `id text primary key`
- `week_start text not null`, `YYYY-MM-DD`
- `week_end text not null`, `YYYY-MM-DD`
- `status text not null`: `draft`, `committed`, `active`, `completed`
- `commit_source text`: `manual`, `auto`
- `committed_at text`
- `generated_at text not null`
- `ai_model text not null`
- `ai_base_url text not null`
- `ai_prompt_hash text not null`
- unique index on `week_start`

### `meal_slots`
- `id text primary key`
- `plan_id text not null references meal_plans(id) on delete cascade`
- `date text not null`, `YYYY-MM-DD`
- `meal_type text not null`: `lunch`, `dinner`
- `recipe_id text not null`
- `recipe_title_snapshot text not null`
- `servings integer not null check(servings >= 1 and servings <= 12)`
- `status text not null default 'planned'`: `planned`, `done`, `skipped`, `moved`
- `swap_count integer not null default 0`
- `notes text not null default ''`
- unique index on `(plan_id, date, meal_type)`

### `shopping_lists`
- `id text primary key`
- `plan_id text not null unique references meal_plans(id) on delete cascade`
- `created_at text not null`
- `updated_at text not null`
- `ai_model text not null`

### `shopping_items`
- `id text primary key`
- `shopping_list_id text not null references shopping_lists(id) on delete cascade`
- `category text not null`
- `name text not null`
- `quantity_text text not null`
- `normalized_name text not null`
- `checked integer not null default 0`
- `source_recipe_ids text not null`, JSON array string
- `sort_order integer not null`

### `ai_events`
- `id text primary key`
- `event_type text not null`: `plan_generate`, `slot_swap`, `shopping_list`, `connectivity_test`
- `created_at text not null`
- `model text not null`
- `base_url text not null`
- `request_json text not null`
- `response_json text`
- `status text not null`: `success`, `validation_failed`, `request_failed`
- `error_message text`

## Recipe Markdown Contract
Recipe files must use YAML front matter and these body sections:

```yaml
---
id: chicken-rice-bowl
title: Chicken Rice Bowl
defaultServings: 2
mealTypes: [lunch, dinner]
tags: [high-protein, easy]
prepTimeMinutes: 15
cookTimeMinutes: 25
---
```

```markdown
## Ingredients
- 1 lb chicken breast
- 1 cup rice
- 2 tbsp soy sauce

## Instructions
1. Cook rice.
2. Cook chicken.
3. Combine and serve.
```

Rules:

- `id` must be lowercase kebab-case and unique.
- `defaultServings` must be `1-12`.
- `mealTypes` must contain `lunch`, `dinner`, or both.
- Ingredients and instructions remain as authored for display.
- Shopping-list consolidation is AI-assisted from ingredient lines.
- Invalid recipes are excluded from planning and shown with file-level errors.

## AI Contracts
Use the OpenAI SDK with:

- `baseURL = settings.ai_base_url`
- `apiKey = 'lm-studio'`
- `model = settings.ai_model`
- `temperature = 0.2`
- JSON-only prompts and Zod validation after every response

Weekly plan response schema:

```ts
{
  slots: Array<{
    date: string;
    mealType: "lunch" | "dinner";
    recipeId: string;
    reason: string;
  }>;
}
```

Validation:

- Exactly 14 slots.
- Every date is in the target Monday-Sunday week.
- Each date has exactly one lunch and one dinner.
- Every recipe ID exists in the recipe catalog.
- Recipe meal types must allow the selected slot.
- Retry once with validation errors included; persist nothing if retry fails.

Slot swap response schema:

```ts
{
  recipeId: string;
  reason: string;
}
```

Shopping-list response schema:

```ts
{
  items: Array<{
    category: "Produce" | "Meat & Seafood" | "Dairy & Eggs" | "Bakery" | "Dry Goods" | "Canned & Jarred" | "Frozen" | "Spices & Condiments" | "Other";
    name: string;
    quantityText: string;
    sourceRecipeIds: string[];
  }>;
}
```

## Workflows
First launch:

- Create database and run migrations automatically.
- Seed default settings and pantry staples.
- Show dashboard empty state until Markdown recipes exist.

Generate plan:

- User clicks Generate Next Week.
- App computes next Monday in configured timezone.
- If no plan exists for that week, call Qwen and persist a `draft`.
- If a draft exists, require explicit replacement.
- Default slot servings come from lunch/dinner settings.
- Generate shopping list after a valid plan is saved.

Edit draft:

- User changes serving counts per slot from `1-12`.
- Serving changes regenerate the shopping list.
- User can swap by AI suggestion or manual recipe selection.
- Swaps increment `swap_count` and regenerate the shopping list.

Commit:

- Manual commit changes `draft` to `committed` and records `commit_source = manual`.
- Lazy auto-lock runs before plan reads/writes; if local time is at or after Monday 00:00 for the plan week, convert `draft` to `active` with `commit_source = auto`.
- Plans in the current local week are shown as active.
- Locked plans reject recipe and serving edits with HTTP `409`.

Daily accountability:

- Dashboard shows today's lunch and dinner for the active plan.
- If either meal is still `planned`, show an in-app reminder banner.
- User can mark meals `done` or `skipped`.

Shopping:

- Shopping list is one-to-one with a plan.
- Items are grouped by category and sorted.
- Pantry staples are excluded.
- User can check/uncheck items after lock.

## API Routes
All routes return `{ ok: true, data }` or `{ ok: false, error: { code, message, details? } }`.

- `GET /api/recipes`
- `GET /api/settings`
- `PATCH /api/settings`
- `POST /api/settings/test-ai`
- `GET /api/plans/current`
- `POST /api/plans/generate`
- `PATCH /api/plans/[planId]/slots/[slotId]`
- `POST /api/plans/[planId]/swap`
- `POST /api/plans/[planId]/commit`
- `POST /api/plans/[planId]/shopping-list`
- `PATCH /api/shopping/items/[itemId]`
- `PATCH /api/adherence`

## UI
Navigation:

- Dashboard
- Plan
- Shopping
- Recipes
- Settings

Dashboard:

- Current date, active week, and AI connectivity status.
- Today's lunch and dinner with servings and `Done` / `Skipped`.
- Reminder banner when today's meals are still planned.
- Next draft status and generate/review action.

Plan page:

- Monday-Sunday grid with lunch and dinner rows.
- Slot cards show recipe title, tags, servings, status, and swap action.
- Serving stepper is disabled after lock.
- Commit button is available for drafts.

Shopping page:

- Category-grouped checklist.
- Source recipe count per item.
- Checked items remain visible with subdued styling.
- Regenerate button only for unlocked plans.

Recipes page:

- Read-only catalog.
- Invalid Markdown files show exact validation errors.
- Recipe details show ingredients and instructions.

Settings page:

- AI endpoint URL, model name, and connectivity test.
- Planning preferences and variety rules.
- Default lunch/dinner servings.
- Timezone field.
- Pantry staples editable list.

## Implementation Stages
1. Create repository documentation and logging files.
2. Scaffold Next.js, dependencies, styling, and scripts.
3. Implement SQLite schema, migrations, repositories, and domain services.
4. Implement Markdown recipe parsing, sample recipes, and recipe page.
5. Implement AI client, prompts, schemas, and event logging.
6. Implement plan APIs and weekly planning UI.
7. Implement shopping-list generation and checklist UI.
8. Implement dashboard, settings, and adherence controls.
9. Run automated checks plus browser and Playwright verification.

## Verification
Automated:

- Unit tests for recipe parsing, duplicate IDs, week calculation, lock rules, servings, pantry normalization, and AI schemas.
- API tests for settings, generate, invalid AI retry, slot edit, swap, commit, locked rejection, shopping, and adherence.
- Playwright tests for first-run, recipes, generate, edit, swap, commit, shopping, and dashboard adherence.

Manual:

- Confirm LM Studio responds at `http://127.0.0.1:1234/v1/models`.
- Run `npm run dev`.
- Use Browser plugin for quick localhost visual inspection.
- Use Playwright MCP for repeatable workflow verification.

## Acceptance Criteria
- The repo contains `docs/IMPLEMENTATION_PLAN.md`, `docs/WORK_LOG.md`, and `docs/HANDOFF.md` before app code changes.
- Work log is updated throughout implementation.
- A fresh agent can read `docs/HANDOFF.md` and continue.
- HelloQwen can generate, edit, commit, and track a weekly meal plan from Markdown recipes and local Qwen.
- AI never persists recipes outside the Markdown catalog.
- Locked plans reject recipe and serving changes.
- Shopping list generation and pantry exclusions work.
- Dashboard shows daily accountability state.
- Automated tests and local visual verification are completed and logged.
