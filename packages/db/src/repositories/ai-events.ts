import { getDb } from "../client.js";
import { aiEvents, type InsertAiEvent } from "../schema.js";

export async function createAiEvent(event: Omit<InsertAiEvent, "id" | "createdAt">) {
  const row: InsertAiEvent = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...event,
  };

  await getDb().insert(aiEvents).values(row);
  return row;
}
