import { z } from "zod";

export const generatePlanRequestSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  replaceExisting: z.boolean().optional(),
  mealCount: z.number().int().positive().safe().optional(),
});

export const createPlanRequestSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const settingsUpdateRequestSchema = z.object({
  timezone: z.string().optional(),
  aiBaseUrl: z.string().optional(),
  aiModel: z.string().optional(),
  planningPreferences: z.string().optional(),
  planningVarietyRules: z.string().optional(),
  defaultMealServings: z.coerce.number().int().min(1).max(12).optional(),
  defaultWeeklyMealCount: z.coerce.number().int().positive().safe().optional(),
  autoGenerateNextWeek: z.boolean().optional(),
  pantryStaples: z.array(z.string()).optional(),
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

export type GeneratePlanRequest = z.infer<typeof generatePlanRequestSchema>;
export type CreatePlanRequest = z.infer<typeof createPlanRequestSchema>;
export type SettingsUpdateRequest = z.infer<typeof settingsUpdateRequestSchema>;
export type CreateMealRequest = z.infer<typeof createMealRequestSchema>;
export type UpdateMealRequest = z.infer<typeof updateMealRequestSchema>;
export type SwapMealRequest = z.infer<typeof swapMealRequestSchema>;
export type UpdateShoppingItemRequest = z.infer<typeof updateShoppingItemRequestSchema>;
export type AdherenceRequest = z.infer<typeof adherenceRequestSchema>;
export type RecipeFilterRequest = z.infer<typeof recipeFilterRequestSchema>;
