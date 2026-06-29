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
      ai_base_url TEXT NOT NULL DEFAULT 'http://ai-gateway:8080/v1',
      ai_model TEXT NOT NULL DEFAULT 'qwen3.6-35b-a3b',
      planning_preferences TEXT NOT NULL DEFAULT '',
      planning_variety_rules TEXT NOT NULL DEFAULT 'Avoid repeating the same recipe in a week unless no alternatives exist.',
      default_lunch_servings INTEGER NOT NULL DEFAULT 1 CHECK(default_lunch_servings >= 1 AND default_lunch_servings <= 12),
      default_dinner_servings INTEGER NOT NULL DEFAULT 1 CHECK(default_dinner_servings >= 1 AND default_dinner_servings <= 12),
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
      commit_source TEXT CHECK(commit_source IN ('manual', 'auto')),
      committed_at TEXT,
      generated_at TEXT NOT NULL,
      ai_model TEXT NOT NULL,
      ai_base_url TEXT NOT NULL,
      ai_prompt_hash TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS meal_plans_week_start_unique ON meal_plans(week_start);
    CREATE INDEX IF NOT EXISTS meal_plans_status_idx ON meal_plans(status);

    CREATE TABLE IF NOT EXISTS meal_slots (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('lunch', 'dinner')),
      recipe_id TEXT NOT NULL,
      recipe_title_snapshot TEXT NOT NULL,
      servings INTEGER NOT NULL CHECK(servings >= 1 AND servings <= 12),
      status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned', 'done', 'skipped', 'moved')),
      swap_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE UNIQUE INDEX IF NOT EXISTS meal_slots_plan_date_meal_unique ON meal_slots(plan_id, date, meal_type);
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
  `);

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
    [process.env.MEALMIND_AI_BASE_URL || "http://ai-gateway:8080/v1", now],
  );

  const pantrySeeds = ["salt", "black pepper", "water", "olive oil", "vegetable oil", "sugar"];
  for (const staple of pantrySeeds) {
    await pool.query(
      "INSERT INTO pantry_staples (name, normalized_name) VALUES ($1, $2) ON CONFLICT (normalized_name) DO NOTHING",
      [staple, staple],
    );
  }
}
