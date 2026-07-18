import { z } from "zod";

export const generatePlanRequestSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  replaceExisting: z.boolean().optional(),
  mealCount: z.number().int().positive().safe().optional(),
});

export const createPlanRequestSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const aiBaseUrlSchema = z.url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
  message: "AI base URL must use HTTP or HTTPS.",
});

export const settingsUpdateRequestSchema = z.object({
  timezone: z.string().optional(),
  aiBaseUrl: aiBaseUrlSchema.optional(),
  aiModel: z.string().trim().min(1).optional(),
  planningPreferences: z.string().optional(),
  planningVarietyRules: z.string().optional(),
  defaultMealServings: z.coerce.number().int().min(1).max(12).optional(),
  defaultWeeklyMealCount: z.coerce.number().int().positive().safe().optional(),
  autoGenerateNextWeek: z.boolean().optional(),
  pantryStaples: z.array(z.string()).optional(),
});

export const aiModelsRequestSchema = z.object({
  aiBaseUrl: aiBaseUrlSchema,
});

const mealSlotLabelSchema = z.string().trim().max(50).transform((value) => value || null).nullable();

export const createMealRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: mealSlotLabelSchema.optional(),
  recipeId: z.string().min(1),
  servings: z.coerce.number().int().min(1).max(12).optional(),
  notes: z.string().max(500).optional(),
});

export const updateMealRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slot: mealSlotLabelSchema.optional(),
  servings: z.coerce.number().int().min(1).max(12).optional(),
  notes: z.string().max(500).optional(),
});

export const updateSkippedDayRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  skipped: z.boolean(),
});

export const swapMealRequestSchema = z.object({
  mode: z.enum(["ai", "manual"]),
  recipeId: z.string().optional(),
  note: z.string().optional(),
});

export const updateShoppingItemRequestSchema = z.object({
  checked: z.boolean(),
});

export const adherenceRequestSchema = z.object({
  mealId: z.string().min(1),
  status: z.enum(["planned", "done", "skipped"]),
});

export const recipeFilterRequestSchema = z.object({
  suggestedSlot: z.string().trim().min(1).optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
});

export const recipeDetailRequestSchema = z.object({
  servings: z.coerce.number().int().min(1).max(12).optional(),
});

export const recipeImportRequestSchema = z.object({
  url: z.string().trim().min(1).max(2048).refine((value) => {
    try {
      const parsed = new URL(value);
      return ["http:", "https:"].includes(parsed.protocol) && !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  }, "Recipe URL must be a public HTTP or HTTPS URL."),
});

export const recipeImportListRequestSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export type GeneratePlanRequest = z.infer<typeof generatePlanRequestSchema>;
export type CreatePlanRequest = z.infer<typeof createPlanRequestSchema>;
export type SettingsUpdateRequest = z.infer<typeof settingsUpdateRequestSchema>;
export type AiModelsRequest = z.infer<typeof aiModelsRequestSchema>;
export type CreateMealRequest = z.infer<typeof createMealRequestSchema>;
export type UpdateMealRequest = z.infer<typeof updateMealRequestSchema>;
export type UpdateSkippedDayRequest = z.infer<typeof updateSkippedDayRequestSchema>;
export type SwapMealRequest = z.infer<typeof swapMealRequestSchema>;
export type UpdateShoppingItemRequest = z.infer<typeof updateShoppingItemRequestSchema>;
export type AdherenceRequest = z.infer<typeof adherenceRequestSchema>;
export type RecipeFilterRequest = z.infer<typeof recipeFilterRequestSchema>;
export type RecipeImportRequest = z.infer<typeof recipeImportRequestSchema>;
export type RecipeImportListRequest = z.infer<typeof recipeImportListRequestSchema>;
