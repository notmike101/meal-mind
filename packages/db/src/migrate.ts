import { closeDb, ensureDatabase } from "./client.js";

await ensureDatabase();
console.log("MealMind Postgres database is initialized.");
await closeDb();
