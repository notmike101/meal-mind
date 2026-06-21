"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X } from "lucide-react";
import type { MealSlotDto } from "@mealmind/contracts";

export function DailyReminder({ slots }: { slots: MealSlotDto[] }) {
  const router = useRouter();
  const [busySlotId, setBusySlotId] = useState<string | null>(null);
  const plannedSlots = slots.filter((slot) => slot.status === "planned");

  async function update(slotId: string, status: "done" | "skipped") {
    setBusySlotId(slotId);
    try {
      await fetch("/api/adherence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, status }),
      });
      router.refresh();
    } finally {
      setBusySlotId(null);
    }
  }

  return (
    <section className="rounded-md bg-white p-5 shadow-line">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-moss">Today</p>
          <h2 className="mt-1 text-xl font-semibold">Active meals</h2>
        </div>
        {plannedSlots.length > 0 ? (
          <span className="rounded-md bg-tomato/10 px-3 py-1 text-sm font-medium text-tomato">
            {plannedSlots.length} meal{plannedSlots.length === 1 ? "" : "s"} still planned
          </span>
        ) : (
          <span className="rounded-md bg-moss/10 px-3 py-1 text-sm font-medium text-moss">All handled</span>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {slots.map((slot) => (
          <div key={slot.id} className="rounded-md border border-ink/10 p-4">
            <p className="text-xs font-semibold uppercase text-moss">{slot.mealType}</p>
            <h3 className="mt-1 font-semibold">{slot.recipeTitleSnapshot}</h3>
            <p className="mt-1 text-sm text-ink/60">
              {slot.servings} serving{slot.servings === 1 ? "" : "s"} · {slot.status}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busySlotId === slot.id}
                onClick={() => update(slot.id, "done")}
                className="focus-ring inline-flex items-center gap-2 rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white"
              >
                <Check size={15} aria-hidden="true" />
                Done
              </button>
              <button
                type="button"
                disabled={busySlotId === slot.id}
                onClick={() => update(slot.id, "skipped")}
                className="focus-ring inline-flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-medium"
              >
                <X size={15} aria-hidden="true" />
                Skipped
              </button>
            </div>
          </div>
        ))}
      </div>

      {slots.length === 0 ? <p className="mt-4 text-sm text-ink/60">No active meals for today.</p> : null}
    </section>
  );
}
