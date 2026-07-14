import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

const DEFAULT_DATABASE_URL = "postgres://mealmind:***@127.0.0.1:5432/mealmind";

const globalForDb = globalThis as unknown as {
  mealMindPool?: pg.Pool;
  mealMindPoolUrl?: string;
};

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
}

export function getPool() {
  const connectionString = getDatabaseUrl();
  if (!globalForDb.mealMindPool || globalForDb.mealMindPoolUrl !== connectionString) {
    globalForDb.mealMindPool = new Pool({ connectionString });
    globalForDb.mealMindPoolUrl = connectionString;
  }
  return globalForDb.mealMindPool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export async function closeDb() {
  await globalForDb.mealMindPool?.end();
  globalForDb.mealMindPool = undefined;
  globalForDb.mealMindPoolUrl = undefined;
}

export async function ensureDatabase() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      timezone TEXT NOT NULL DEFAULT 'America/Chicago',
      ai_base_url TEXT NOT NULL DEFAULT 'http://host.docker.internal:1234/v1',
      ai_model TEXT NOT NULL DEFAULT 'qwen3.6-35b-a3b',
      planning_preferences TEXT NOT NULL DEFAULT '',
      planning_variety_rules TEXT NOT NULL DEFAULT 'Avoid repeating the same recipe in a week unless no alternatives exist.',
      default_lunch_servings INTEGER NOT NULL DEFAULT 1 CHECK(default_lunch_servings >= 1 AND default_lunch_servings <= 12),
      default_dinner_servings INTEGER NOT NULL DEFAULT 1 CHECK(default_dinner_servings >= 1 AND default_dinner_servings <= 12),
      default_meal_servings INTEGER NOT NULL DEFAULT 1 CHECK(default_meal_servings >= 1 AND default_meal_servings <= 12),
      default_weekly_meal_count INTEGER NOT NULL DEFAULT 14 CHECK(default_weekly_meal_count >= 1),
      auto_generate_next_week BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pantry_staples (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('draft', 'committed', 'active', 'completed')),
      creation_source TEXT NOT NULL DEFAULT 'ai' CHECK(creation_source IN ('manual', 'ai')),
      commit_source TEXT CHECK(commit_source IN ('manual', 'auto')),
      committed_at TEXT,
      generated_at TEXT NOT NULL,
      ai_model TEXT,
      ai_base_url TEXT,
      ai_prompt_hash TEXT,
      skipped_dates JSONB NOT NULL DEFAULT '[]'::jsonb
    );

    CREATE UNIQUE INDEX IF NOT EXISTS meal_plans_week_start_unique ON meal_plans(week_start);
    CREATE INDEX IF NOT EXISTS meal_plans_status_idx ON meal_plans(status);

    CREATE TABLE IF NOT EXISTS meal_slots (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      meal_type TEXT,
      recipe_id TEXT NOT NULL,
      recipe_title_snapshot TEXT NOT NULL,
      servings INTEGER NOT NULL CHECK(servings >= 1 AND servings <= 12),
      status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned', 'done', 'skipped', 'moved')),
      swap_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS meal_slots_plan_idx ON meal_slots(plan_id);

    CREATE TABLE IF NOT EXISTS shopping_lists (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL UNIQUE REFERENCES meal_plans(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      ai_model TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      shopping_list_id TEXT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity_text TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      checked BOOLEAN NOT NULL DEFAULT FALSE,
      source_recipe_ids TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS shopping_items_list_idx ON shopping_items(shopping_list_id);

    CREATE TABLE IF NOT EXISTS ai_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL CHECK(event_type IN ('plan_generate', 'slot_swap', 'shopping_list', 'connectivity_test')),
      created_at TEXT NOT NULL,
      model TEXT NOT NULL,
      base_url TEXT NOT NULL,
      request_json TEXT NOT NULL,
      response_json TEXT,
      status TEXT NOT NULL CHECK(status IN ('success', 'validation_failed', 'request_failed')),
      error_message TEXT
    );

    CREATE INDEX IF NOT EXISTS ai_events_type_idx ON ai_events(event_type);

    ALTER TABLE settings
      ADD COLUMN IF NOT EXISTS auto_generate_next_week BOOLEAN NOT NULL DEFAULT TRUE;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'default_meal_servings'
      ) THEN
        ALTER TABLE settings ADD COLUMN default_meal_servings INTEGER;
        UPDATE settings SET default_meal_servings = default_dinner_servings;
        ALTER TABLE settings ALTER COLUMN default_meal_servings SET DEFAULT 1;
        ALTER TABLE settings ALTER COLUMN default_meal_servings SET NOT NULL;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'default_weekly_meal_count'
      ) THEN
        ALTER TABLE settings ADD COLUMN default_weekly_meal_count INTEGER NOT NULL DEFAULT 14;
      END IF;
    END $$;

    ALTER TABLE meal_plans
      ADD COLUMN IF NOT EXISTS creation_source TEXT NOT NULL DEFAULT 'ai';
    ALTER TABLE meal_plans
      ADD COLUMN IF NOT EXISTS skipped_dates JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE meal_plans ALTER COLUMN ai_model DROP NOT NULL;
    ALTER TABLE meal_plans ALTER COLUMN ai_base_url DROP NOT NULL;
    ALTER TABLE meal_plans ALTER COLUMN ai_prompt_hash DROP NOT NULL;

    ALTER TABLE meal_slots DROP CONSTRAINT IF EXISTS meal_slots_meal_type_check;
    ALTER TABLE meal_slots ALTER COLUMN meal_type DROP NOT NULL;
    DROP INDEX IF EXISTS meal_slots_plan_date_meal_unique;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'meal_slots' AND column_name = 'sort_order'
      ) THEN
        ALTER TABLE meal_slots ADD COLUMN sort_order INTEGER;
        WITH ordered AS (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY plan_id, date
            ORDER BY CASE meal_type WHEN 'lunch' THEN 0 WHEN 'dinner' THEN 1 ELSE 2 END, id
          ) - 1 AS position
          FROM meal_slots
        )
        UPDATE meal_slots
        SET sort_order = ordered.position
        FROM ordered
        WHERE meal_slots.id = ordered.id;
        ALTER TABLE meal_slots ALTER COLUMN sort_order SET DEFAULT 0;
        ALTER TABLE meal_slots ALTER COLUMN sort_order SET NOT NULL;
      END IF;
    END $$;
  `);

  const directAiBaseUrl = process.env.MEALMIND_AI_BASE_URL || "http://host.docker.internal:1234/v1";
  await pool.query(
    `UPDATE settings SET ai_base_url = $1 WHERE id = 1 AND ai_base_url = 'http://ai-gateway:8080/v1'`,
    [directAiBaseUrl],
  );

  const now = new Date().toISOString();
  await pool.query(
    `
    INSERT INTO settings (
      id,
      timezone,
      ai_base_url,
      ai_model,
      planning_preferences,
      planning_variety_rules,
      default_lunch_servings,
      default_dinner_servings,
      created_at,
      updated_at
    ) VALUES (
      1,
      'America/Chicago',
      $1,
      'qwen3.6-35b-a3b',
      '',
      'Avoid repeating the same recipe in a week unless no alternatives exist.',
      1,
      1,
      $2,
      $2
    )
    ON CONFLICT (id) DO NOTHING
    `,
    [directAiBaseUrl, now],
  );

  const pantrySeeds = ["salt", "black pepper", "water", "olive oil", "vegetable oil", "sugar"];
  for (const staple of pantrySeeds) {
    await pool.query(
      "INSERT INTO pantry_staples (name, normalized_name) VALUES ($1, $2) ON CONFLICT (normalized_name) DO NOTHING",
      [staple, staple],
    );
  }
}
