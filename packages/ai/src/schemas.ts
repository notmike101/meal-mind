import { z } from "zod";

export const weeklyPlanDraftSchema = z.object({
  slots: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        mealType: z.enum(["lunch", "dinner"]),
        recipeId: z.string().min(1),
        reason: z.string().min(1).max(500),
      }),
    )
    .length(14),
});

export const slotSwapSchema = z.object({
  recipeId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

export const shoppingCategorySchema = z.enum([
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Dry Goods",
  "Canned & Jarred",
  "Frozen",
  "Spices & Condiments",
  "Other",
]);

export const shoppingListDraftSchema = z.object({
  items: z.array(
    z.object({
      category: shoppingCategorySchema,
      name: z.string().min(1),
      quantityText: z.string().min(1),
      sourceRecipeIds: z.array(z.string().min(1)).min(1),
    }),
  ),
});

export type WeeklyPlanDraft = z.infer<typeof weeklyPlanDraftSchema>;
export type SlotSwap = z.infer<typeof slotSwapSchema>;
export type ShoppingListDraft = z.infer<typeof shoppingListDraftSchema>;
export type ShoppingCategory = z.infer<typeof shoppingCategorySchema>;
