import { eq } from "drizzle-orm";
import { normalizePantryName, validateServingCount } from "@mealmind/domain";
import { areAiBaseUrlsEqual, normalizeAiBaseUrl, type AiConnectionSettings, type PublicSettingsDto, type SettingsDto } from "@mealmind/contracts";
import { getDb } from "../client.js";
import { pantryStaples, settings } from "../schema.js";

export type SettingsUpdate = {
  timezone?: string;
  aiBaseUrl?: string;
  aiModel?: string;
  aiApiKey?: string | null;
  planningPreferences?: string;
  planningVarietyRules?: string;
  defaultMealServings?: number;
  defaultWeeklyMealCount?: number;
  autoGenerateNextWeek?: boolean;
  pantryStaples?: string[];
};

export async function getSettings() {
  const current = (await getDb().select().from(settings).where(eq(settings.id, 1)).limit(1))[0];
  if (!current) {
    throw new Error("Settings row was not initialized.");
  }
  // NULL preserves legacy environment auth; empty text explicitly disables auth.
  return { ...current, aiApiKey: current.aiApiKey === null ? undefined : current.aiApiKey || null };
}

export function toPublicSettings(current: SettingsDto & AiConnectionSettings): PublicSettingsDto {
  const { aiApiKey, ...publicSettings } = current;
  return {
    ...publicSettings,
    aiAuthConfigured: Boolean(aiApiKey === undefined ? process.env.OPENAI_COMPATIBLE_API_KEY?.trim() : aiApiKey),
  };
}

export async function getPantryStaples() {
  return getDb().select().from(pantryStaples).orderBy(pantryStaples.name);
}

export async function getSettingsWithPantry() {
  const [currentSettings, staples] = await Promise.all([getSettings(), getPantryStaples()]);
  return {
    settings: toPublicSettings(currentSettings),
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
    updates.aiBaseUrl = normalizeAiBaseUrl(input.aiBaseUrl);
    const current = await getSettings();
    if (input.aiApiKey === undefined && !areAiBaseUrlsEqual(updates.aiBaseUrl, current.aiBaseUrl)) {
      updates.aiApiKey = "";
    }
  }

  if (input.aiApiKey !== undefined) {
    updates.aiApiKey = input.aiApiKey?.trim() || "";
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

  if (input.defaultMealServings !== undefined) {
    updates.defaultMealServings = validateServingCount(input.defaultMealServings);
  }

  if (input.defaultWeeklyMealCount !== undefined) {
    if (!Number.isSafeInteger(input.defaultWeeklyMealCount) || input.defaultWeeklyMealCount < 1) {
      throw new Error("Default weekly meal count must be a positive integer.");
    }
    updates.defaultWeeklyMealCount = input.defaultWeeklyMealCount;
  }

  if (input.autoGenerateNextWeek !== undefined) {
    updates.autoGenerateNextWeek = input.autoGenerateNextWeek;
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
