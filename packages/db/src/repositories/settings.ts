import { eq } from "drizzle-orm";
import { normalizePantryName, validateServingCount } from "@helloqwen/domain";
import { getDb } from "../client.js";
import { pantryStaples, settings } from "../schema.js";

export type SettingsUpdate = {
  timezone?: string;
  aiBaseUrl?: string;
  aiModel?: string;
  planningPreferences?: string;
  planningVarietyRules?: string;
  defaultLunchServings?: number;
  defaultDinnerServings?: number;
  pantryStaples?: string[];
};

export async function getSettings() {
  const current = (await getDb().select().from(settings).where(eq(settings.id, 1)).limit(1))[0];
  if (!current) {
    throw new Error("Settings row was not initialized.");
  }
  return current;
}

export async function getPantryStaples() {
  return getDb().select().from(pantryStaples).orderBy(pantryStaples.name);
}

export async function getSettingsWithPantry() {
  const [currentSettings, staples] = await Promise.all([getSettings(), getPantryStaples()]);
  return {
    settings: currentSettings,
    pantryStaples: staples,
  };
}

export async function updateSettings(input: SettingsUpdate) {
  const db = getDb();
  const now = new Date().toISOString();
  const updates: Partial<typeof settings.$inferInsert> = {
    updatedAt: now,
  };

  if (input.timezone !== undefined) {
    Intl.DateTimeFormat(undefined, { timeZone: input.timezone });
    updates.timezone = input.timezone;
  }

  if (input.aiBaseUrl !== undefined) {
    const url = new URL(input.aiBaseUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("AI base URL must use HTTP or HTTPS.");
    }
    updates.aiBaseUrl = url.toString().replace(/\/$/, "");
  }

  if (input.aiModel !== undefined) {
    updates.aiModel = input.aiModel.trim();
  }

  if (input.planningPreferences !== undefined) {
    updates.planningPreferences = input.planningPreferences;
  }

  if (input.planningVarietyRules !== undefined) {
    updates.planningVarietyRules = input.planningVarietyRules;
  }

  if (input.defaultLunchServings !== undefined) {
    updates.defaultLunchServings = validateServingCount(input.defaultLunchServings);
  }

  if (input.defaultDinnerServings !== undefined) {
    updates.defaultDinnerServings = validateServingCount(input.defaultDinnerServings);
  }

  await db.update(settings).set(updates).where(eq(settings.id, 1));

  if (input.pantryStaples !== undefined) {
    await db.transaction(async (tx) => {
      await tx.delete(pantryStaples);
      const normalized = new Map<string, string>();
      for (const staple of input.pantryStaples ?? []) {
        const name = staple.trim();
        if (!name) {
          continue;
        }
        normalized.set(normalizePantryName(name), name);
      }

      for (const [normalizedName, name] of normalized) {
        await tx.insert(pantryStaples).values({ name, normalizedName });
      }
    });
  }

  return getSettingsWithPantry();
}
