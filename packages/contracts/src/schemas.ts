import { z } from "zod";

export const generatePlanRequestSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  replaceExisting: z.boolean().optional(),
});

export const settingsUpdateRequestSchema = z.object({
  timezone: z.string().optional(),
  aiBaseUrl: z.string().optional(),
  aiModel: z.string().optional(),
  planningPreferences: z.string().optional(),
  planningVarietyRules: z.string().optional(),
  defaultLunchServings: z.coerce.number().int().min(1).max(12).optional(),
  defaultDinnerServings: z.coerce.number().int().min(1).max(12).optional(),
  autoGenerateNextWeek: z.boolean().optional(),
  pantryStaples: z.array(z.string()).optional(),
});

export const updateSlotRequestSchema = z.object({
  servings: z.coerce.number().int().min(1).max(12).optional(),
  notes: z.string().optional(),
});

export const swapSlotRequestSchema = z.object({
  slotId: z.string().min(1),
  mode: z.enum(["ai", "manual"]),
  recipeId: z.string().optional(),
  note: z.string().optional(),
});

export const updateShoppingItemRequestSchema = z.object({
  checked: z.boolean(),
});

export const adherenceRequestSchema = z.object({
  slotId: z.string().min(1),
  status: z.enum(["planned", "done", "skipped"]),
});

export const recipeFilterRequestSchema = z.object({
  mealType: z.enum(["lunch", "dinner"]).optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
});

export type GeneratePlanRequest = z.infer<typeof generatePlanRequestSchema>;
export type SettingsUpdateRequest = z.infer<typeof settingsUpdateRequestSchema>;
export type UpdateSlotRequest = z.infer<typeof updateSlotRequestSchema>;
export type SwapSlotRequest = z.infer<typeof swapSlotRequestSchema>;
export type UpdateShoppingItemRequest = z.infer<typeof updateShoppingItemRequestSchema>;
export type AdherenceRequest = z.infer<typeof adherenceRequestSchema>;
export type RecipeFilterRequest = z.infer<typeof recipeFilterRequestSchema>;
