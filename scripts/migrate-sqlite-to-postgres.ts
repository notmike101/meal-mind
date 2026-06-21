import Database from "better-sqlite3";
import { closeDb, ensureDatabase, getPool } from "@mealmind/db";

const sqlitePath = process.env.MEALMIND_SQLITE_PATH ?? "data/mealmind.sqlite";

const tableOrder = [
  "settings",
  "pantry_staples",
  "meal_plans",
  "meal_slots",
  "shopping_lists",
  "shopping_items",
  "ai_events",
];

function quoteIdent(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

await ensureDatabase();
const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
const pg = getPool();

try {
  for (const table of tableOrder) {
    const rows = sqlite.prepare(`SELECT * FROM ${quoteIdent(table)}`).all() as Record<string, unknown>[];
    if (rows.length === 0) {
      continue;
    }

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const updateSet = columns
      .filter((column) => column !== "id")
      .map((column) => `${quoteIdent(column)} = EXCLUDED.${quoteIdent(column)}`)
      .join(", ");
    const sql = `
      INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")})
      VALUES (${placeholders})
      ON CONFLICT (id) DO ${updateSet ? `UPDATE SET ${updateSet}` : "NOTHING"}
    `;

    for (const row of rows) {
      await pg.query(sql, columns.map((column) => row[column]));
    }

    console.log(`Migrated ${rows.length} row(s) from ${table}.`);
  }
} finally {
  sqlite.close();
  await closeDb();
}
