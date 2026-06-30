# Plan: Flexible Meal Slots (breakfast/lunch/dinner + custom labels)

## Goal

Replace the hardcoded `MealType = "lunch" | "dinner"` with a system that supports:
- **Default slots**: breakfast, lunch, dinner per day (21 slots/week instead of 14)
- **Custom meal type labels** — users can add/remove/rename meal types in settings
- **Any recipe assigned to any slot** based on compatible `mealTypes`

## Design Decisions

### 1. Database schema change
- Remove the enum constraint from `meal_slots.meal_type` column (change from `text({ enum: [...] })` to plain `text()`)
- This allows arbitrary labels without migrations for each new type
- Add a `meal_types_settings` table to store user-configured meal types with defaults

### 2. Settings model change
- Replace `defaultLunchServings` / `defaultDinnerServings` with a single `defaultServings: number` field (or a map keyed by meal type)
- Store configured meal types in settings as an array: `["breakfast", "lunch", "dinner"]`

### 3. Domain layer changes
- Remove `MealType` union type; replace with `string` for slot mealTypes
- `getWeekSlots()` becomes parameterized by the configured meal types list (or uses defaults)
- Validation in `validatePlannedSlotsForWeek()` checks against expected slots derived from configured types

### 4. AI prompt changes
- Update system message to plan N meals per day instead of "one lunch and one dinner"
- Schema change: `weeklyPlanDraftSchema` accepts variable-length slot arrays (not `.length(14)`)
- Slot swap messages pass the actual mealType from the slot

### 5. Recipe compatibility
- Recipes already have `mealTypes: string[]` — this works as-is for arbitrary labels
- The filter in `recipes.ts` validates against `["lunch", "dinner"]` enum — remove that constraint

### 6. UI changes (minimal for plan phase)
- Settings page: allow configuring meal types list and default servings

## Files to modify (in execution order)

1. **Database migration** — new file in `packages/db/src/migrations/` or inline schema change
2. **`packages/domain/src/weeks.ts`** — remove `MealType` type, make `getWeekSlots()` configurable
3. **`packages/domain/src/meal-plans.ts`** — update validation to use configured meal types
4. **`packages/domain/src/recipes.ts`** — remove enum constraint from `mealTypeSchema`
5. **`packages/db/src/schema.ts`** — relax `meal_type` column, add settings fields for meal types config
6. **`packages/contracts/src/types.ts`** — update `MealType`, `SettingsDto`, `MealSlotDto`
7. **`packages/contracts/src/schemas.ts`** — update `settingsUpdateRequestSchema`, `recipeFilterRequestSchema`
8. **`packages/ai/src/schemas.ts`** — update `weeklyPlanDraftSchema` (remove `.length(14)`)
9. **`packages/ai/src/prompts.ts`** — update system message, pass dynamic meal types to AI
10. **`services/api/src/services/planning.ts`** — fix default servings logic, use configured meal types
11. **`services/api/src/routes.ts`** — no changes needed (already uses schemas)
12. **Frontend settings components** — update `ServingFields.vue`, add meal type config UI

## Migration strategy

### DB migration approach
Since this is a Postgres schema, we need to:
1. Change `meal_slots.meal_type` from constrained enum text to unconstrained text
2. Add new columns to `settings`: `configuredMealTypes` (text JSON array), `defaultServings` (integer)
3. Backfill existing settings with defaults

### Data migration for existing plans
- Existing slots with `"lunch"` / `"dinner"` meal types remain valid — they're just strings now
- No data loss; the enum constraint is being relaxed, not values changed

## Risks & Mitigations

1. **Existing recipe metadata** — recipes already store `mealTypes: string[]`. The Zod validation in `recipes.ts` restricts to `["lunch", "dinner"]`. Removing this restriction means new meal types like `"breakfast"` can be assigned, which is the goal.
2. **AI prompt familiarity** — the AI currently expects exactly 14 slots. Changing to 21 (or variable) requires updating the schema and prompt simultaneously.
3. **Shopping list generation** — already iterates over all slots generically; no changes needed there.

## Execution order

Phase 1: Domain + DB schema (foundation)
- Relax `meal_type` enum in DB schema
- Add meal type config to settings  
- Update domain types and validation logic
- Update contracts types

Phase 2: AI layer
- Update prompt templates for variable meal types
- Update Zod schemas for variable slot counts
- Fix default servings logic

Phase 3: Frontend (if time permits)
- Settings UI update for meal type configuration
