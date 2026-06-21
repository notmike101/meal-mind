"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Minus, Plus, RefreshCw, Shuffle } from "lucide-react";
import type { MealSlotDto, RecipeSummaryDto } from "@helloqwen/contracts";
import { formatDisplayDate } from "@/lib/utils";

type MealSlotCardProps = {
  planId: string;
  slot: MealSlotDto;
  recipes: Pick<RecipeSummaryDto, "id" | "title" | "mealTypes" | "tags">[];
  locked: boolean;
};

export function MealSlotCard({ planId, slot, recipes, locked }: MealSlotCardProps) {
  const router = useRouter();
  const [servings, setServings] = useState(slot.servings);
  const [selectedRecipeId, setSelectedRecipeId] = useState(slot.recipeId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compatibleRecipes = useMemo(
    () => recipes.filter((recipe) => recipe.mealTypes.includes(slot.mealType)),
    [recipes, slot.mealType],
  );

  async function updateServings(nextServings: number) {
    if (nextServings < 1 || nextServings > 12) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/plans/${planId}/slots/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servings: nextServings }),
      });
      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error?.message ?? "Could not update servings.");
      }
      setServings(nextServings);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function swap(mode: "manual" | "ai") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/plans/${planId}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          mode,
          recipeId: mode === "manual" ? selectedRecipeId : undefined,
        }),
      });
      const payload = await response.json();
      if (!payload.ok) {
        throw new Error(payload.error?.message ?? "Could not swap recipe.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="min-h-[210px] rounded-md bg-white p-4 shadow-line">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-moss">{slot.mealType}</p>
          <h3 className="mt-1 text-base font-semibold leading-snug">{slot.recipeTitleSnapshot}</h3>
          <p className="mt-1 text-xs text-ink/55">{formatDisplayDate(slot.date)}</p>
        </div>
        <span className="rounded-md bg-field px-2 py-1 text-xs font-medium text-ink/65">
          {slot.status}
        </span>
      </div>

      {slot.notes ? <p className="mt-3 line-clamp-2 text-sm text-ink/65">{slot.notes}</p> : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Servings</span>
        <div className="flex h-9 items-center overflow-hidden rounded-md border border-ink/10">
          <button
            type="button"
            aria-label="Decrease servings"
            disabled={locked || busy || servings <= 1}
            onClick={() => updateServings(servings - 1)}
            className="focus-ring flex h-9 w-9 items-center justify-center hover:bg-field"
          >
            <Minus size={15} aria-hidden="true" />
          </button>
          <span className="flex h-9 min-w-10 items-center justify-center border-x border-ink/10 text-sm font-semibold">
            {servings}
          </span>
          <button
            type="button"
            aria-label="Increase servings"
            disabled={locked || busy || servings >= 12}
            onClick={() => updateServings(servings + 1)}
            className="focus-ring flex h-9 w-9 items-center justify-center hover:bg-field"
          >
            <Plus size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <select
          value={selectedRecipeId}
          disabled={locked || busy}
          onChange={(event) => setSelectedRecipeId(event.target.value)}
          className="focus-ring w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm"
        >
          {compatibleRecipes.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.title}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => swap("manual")}
            disabled={locked || busy || selectedRecipeId === slot.recipeId}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-medium hover:bg-field"
          >
            <Shuffle size={15} aria-hidden="true" />
            Swap
          </button>
          <button
            type="button"
            onClick={() => swap("ai")}
            disabled={locked || busy}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-medium hover:bg-field"
          >
            <RefreshCw size={15} className={busy ? "animate-spin" : ""} aria-hidden="true" />
            AI
          </button>
        </div>
      </div>

      {locked ? <p className="mt-3 text-xs text-ink/55">Locked plans cannot be edited.</p> : null}
      {error ? <p className="mt-3 text-sm text-tomato">{error}</p> : null}
    </article>
  );
}
