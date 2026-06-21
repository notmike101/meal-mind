"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { RefreshCw, ShoppingBasket } from "lucide-react";
import type { ShoppingItemDto } from "@mealmind/contracts";

type ShoppingListClientProps = {
  planId: string;
  items: ShoppingItemDto[];
  canRegenerate: boolean;
};

export function ShoppingListClient({ planId, items, canRegenerate }: ShoppingListClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingItemDto[]>();
    for (const item of items) {
      map.set(item.category, [...(map.get(item.category) ?? []), item]);
    }
    return [...map.entries()];
  }, [items]);

  async function updateItem(itemId: string, checked: boolean) {
    setBusy(itemId);
    setError(null);
    try {
      const response = await fetch(`/api/shopping/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });
      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error?.message ?? "Could not update item.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }

  async function regenerate() {
    setBusy("regenerate");
    setError(null);
    try {
      const response = await fetch(`/api/plans/${planId}/shopping-list`, { method: "POST" });
      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error?.message ?? "Could not regenerate shopping list.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBasket size={20} aria-hidden="true" />
          <h2 className="text-xl font-semibold">Shopping list</h2>
        </div>
        {canRegenerate ? (
          <button
            type="button"
            onClick={regenerate}
            disabled={busy === "regenerate"}
            className="focus-ring inline-flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-medium hover:bg-field"
          >
            <RefreshCw size={15} className={busy === "regenerate" ? "animate-spin" : ""} aria-hidden="true" />
            Regenerate
          </button>
        ) : null}
      </div>

      {grouped.map(([category, categoryItems]) => (
        <section key={category} className="rounded-md bg-white p-4 shadow-line">
          <h3 className="font-semibold">{category}</h3>
          <div className="mt-3 divide-y divide-ink/10">
            {categoryItems.map((item) => {
              const sources = JSON.parse(item.sourceRecipeIds) as string[];
              return (
                <label key={item.id} className="flex cursor-pointer gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    disabled={busy === item.id}
                    onChange={(event) => updateItem(item.id, event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span className={item.checked ? "text-ink/45 line-through" : ""}>
                    <span className="block font-medium">{item.name}</span>
                    <span className="block text-sm text-ink/60">
                      {item.quantityText} · {sources.length} source{sources.length === 1 ? "" : "s"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      ))}

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-ink/20 bg-white p-6 text-ink/70">
          No shopping items have been generated yet.
        </div>
      ) : null}
      {error ? <p className="text-sm text-tomato">{error}</p> : null}
    </div>
  );
}
