import { eq } from "drizzle-orm";
import { getDb } from "../client.js";
import {
  shoppingItems,
  shoppingLists,
  type InsertShoppingItem,
  type InsertShoppingList,
  type ShoppingItem,
  type ShoppingList,
} from "../schema.js";

export type ShoppingListWithItems = ShoppingList & {
  items: ShoppingItem[];
};

export async function replaceShoppingList(
  planId: string,
  aiModel: string,
  items: Omit<InsertShoppingItem, "shoppingListId">[],
) {
  const db = getDb();
  const now = new Date().toISOString();
  const list: InsertShoppingList = {
    id: crypto.randomUUID(),
    planId,
    createdAt: now,
    updatedAt: now,
    aiModel,
  };

  await db.transaction(async (tx) => {
    await tx.delete(shoppingLists).where(eq(shoppingLists.planId, planId));
    await tx.insert(shoppingLists).values(list);
    if (items.length > 0) {
      await tx.insert(shoppingItems).values(items.map((item) => ({ ...item, shoppingListId: list.id })));
    }
  });

  return getShoppingListForPlan(planId);
}

export async function getShoppingListForPlan(planId: string): Promise<ShoppingListWithItems | null> {
  const db = getDb();
  const list = (await db.select().from(shoppingLists).where(eq(shoppingLists.planId, planId)).limit(1))[0];
  if (!list) {
    return null;
  }

  const items = await db
    .select()
    .from(shoppingItems)
    .where(eq(shoppingItems.shoppingListId, list.id))
    .orderBy(shoppingItems.sortOrder);

  return { ...list, items };
}

export async function updateShoppingItemChecked(itemId: string, checked: boolean) {
  const db = getDb();
  await db.update(shoppingItems).set({ checked }).where(eq(shoppingItems.id, itemId));
  const item = (await db.select().from(shoppingItems).where(eq(shoppingItems.id, itemId)).limit(1))[0];
  if (!item) {
    return null;
  }
  return (await db.select().from(shoppingLists).where(eq(shoppingLists.id, item.shoppingListId)).limit(1))[0] ?? null;
}
