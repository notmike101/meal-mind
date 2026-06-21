import { closeDb, ensureDatabase } from "./client.js";

await ensureDatabase();
console.log("HelloQwen Postgres database is initialized.");
await closeDb();
