import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  timezone: text("timezone").notNull().default("America/Chicago"),
  aiBaseUrl: text("ai_base_url").notNull().default("http://ai-gateway:8080/v1"),
  aiModel: text("ai_model").notNull().default("qwen3.6-35b-a3b"),
  planningPreferences: text("planning_preferences").notNull().default(""),
  planningVarietyRules: text("planning_variety_rules")
    .notNull()
    .default("Avoid repeating the same recipe in a week unless no alternatives exist."),
  defaultMealServings: integer("default_meal_servings").notNull().default(1),
  defaultWeeklyMealCount: integer("default_weekly_meal_count").notNull().default(14),
  autoGenerateNextWeek: boolean("auto_generate_next_week").notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const pantryStaples = pgTable("pantry_staples", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull().unique(),
});

export const mealPlans = pgTable(
  "meal_plans",
  {
    id: text("id").primaryKey(),
    weekStart: text("week_start").notNull(),
    weekEnd: text("week_end").notNull(),
    status: text("status", { enum: ["draft", "committed", "active", "completed"] }).notNull(),
    creationSource: text("creation_source", { enum: ["manual", "ai"] }).notNull().default("ai"),
    commitSource: text("commit_source", { enum: ["manual", "auto"] }),
    committedAt: text("committed_at"),
    createdAt: text("generated_at").notNull(),
    aiModel: text("ai_model"),
    aiBaseUrl: text("ai_base_url"),
    aiPromptHash: text("ai_prompt_hash"),
  },
  (table) => [
    uniqueIndex("meal_plans_week_start_unique").on(table.weekStart),
    index("meal_plans_status_idx").on(table.status),
  ],
);

export const planMeals = pgTable(
  "meal_slots",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => mealPlans.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    slot: text("meal_type"),
    recipeId: text("recipe_id").notNull(),
    recipeTitleSnapshot: text("recipe_title_snapshot").notNull(),
    servings: integer("servings").notNull(),
    status: text("status", { enum: ["planned", "done", "skipped", "moved"] })
      .notNull()
      .default("planned"),
    swapCount: integer("swap_count").notNull().default(0),
    notes: text("notes").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("meal_slots_plan_idx").on(table.planId),
  ],
);

export const shoppingLists = pgTable("shopping_lists", {
  id: text("id").primaryKey(),
  planId: text("plan_id")
    .notNull()
    .unique()
    .references(() => mealPlans.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  aiModel: text("ai_model").notNull(),
});

export const shoppingItems = pgTable(
  "shopping_items",
  {
    id: text("id").primaryKey(),
    shoppingListId: text("shopping_list_id")
      .notNull()
      .references(() => shoppingLists.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    name: text("name").notNull(),
    quantityText: text("quantity_text").notNull(),
    normalizedName: text("normalized_name").notNull(),
    checked: boolean("checked").notNull().default(false),
    sourceRecipeIds: text("source_recipe_ids").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [index("shopping_items_list_idx").on(table.shoppingListId)],
);

export const aiEvents = pgTable(
  "ai_events",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type", {
      enum: ["plan_generate", "slot_swap", "shopping_list", "connectivity_test"],
    }).notNull(),
    createdAt: text("created_at").notNull(),
    model: text("model").notNull(),
    baseUrl: text("base_url").notNull(),
    requestJson: text("request_json").notNull(),
    responseJson: text("response_json"),
    status: text("status", { enum: ["success", "validation_failed", "request_failed"] }).notNull(),
    errorMessage: text("error_message"),
  },
  (table) => [index("ai_events_type_idx").on(table.eventType)],
);

export const mealPlansRelations = relations(mealPlans, ({ many }) => ({
  meals: many(planMeals),
  shoppingLists: many(shoppingLists),
}));

export const planMealsRelations = relations(planMeals, ({ one }) => ({
  plan: one(mealPlans, {
    fields: [planMeals.planId],
    references: [mealPlans.id],
  }),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ one, many }) => ({
  plan: one(mealPlans, {
    fields: [shoppingLists.planId],
    references: [mealPlans.id],
  }),
  items: many(shoppingItems),
}));

export const shoppingItemsRelations = relations(shoppingItems, ({ one }) => ({
  list: one(shoppingLists, {
    fields: [shoppingItems.shoppingListId],
    references: [shoppingLists.id],
  }),
}));

export type Settings = InferSelectModel<typeof settings>;
export type InsertSettings = InferInsertModel<typeof settings>;
export type PantryStaple = InferSelectModel<typeof pantryStaples>;
export type MealPlan = InferSelectModel<typeof mealPlans>;
export type InsertMealPlan = InferInsertModel<typeof mealPlans>;
export type PlanMeal = InferSelectModel<typeof planMeals>;
export type InsertPlanMeal = InferInsertModel<typeof planMeals>;
export type ShoppingList = InferSelectModel<typeof shoppingLists>;
export type InsertShoppingList = InferInsertModel<typeof shoppingLists>;
export type ShoppingItem = InferSelectModel<typeof shoppingItems>;
export type InsertShoppingItem = InferInsertModel<typeof shoppingItems>;
export type AiEvent = InferSelectModel<typeof aiEvents>;
export type InsertAiEvent = InferInsertModel<typeof aiEvents>;
