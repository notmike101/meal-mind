import { Lock, Unlock } from "lucide-react";
import { CommitPlanButton } from "@/components/commit-plan-button";
import { GeneratePlanButton } from "@/components/generate-plan-button";
import { MealSlotCard } from "@/components/meal-slot-card";
import { getDatesInWeek, isPlanLocked } from "@helloqwen/domain";
import { getPlanningState, getRecipes } from "@/lib/api-client";
import { formatDisplayDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const [{ activePlan, nextDraft, nextWeek }, { recipes, invalidRecipes }] = await Promise.all([
    getPlanningState(),
    getRecipes(),
  ]);
  const plan = nextDraft ?? activePlan;
  const locked = plan ? isPlanLocked(plan) : false;
  const dates = plan ? getDatesInWeek(plan.weekStart) : [];
  const recipesForClient = recipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    mealTypes: recipe.mealTypes,
    tags: recipe.tags,
  }));

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-moss">Plan</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Weekly meal grid</h1>
          <p className="mt-2 max-w-3xl text-ink/70">Next week&apos;s lunch and dinner selections.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GeneratePlanButton replaceExisting={nextDraft?.status === "draft"} />
          {plan && plan.status === "draft" ? <CommitPlanButton planId={plan.id} /> : null}
        </div>
      </section>

      {invalidRecipes.length > 0 ? (
        <div className="rounded-md border border-tomato/30 bg-tomato/5 p-4 text-sm text-tomato">
          {invalidRecipes.length} invalid recipe file{invalidRecipes.length === 1 ? "" : "s"} excluded from planning.
        </div>
      ) : null}

      {plan ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 rounded-md bg-white p-4 shadow-line sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">
                {plan.weekStart} through {plan.weekEnd}
              </h2>
              <p className="text-sm text-ink/60">
                {plan.status} · generated with {plan.aiModel}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-md bg-field px-3 py-2 text-sm font-medium">
              {locked ? <Lock size={15} aria-hidden="true" /> : <Unlock size={15} aria-hidden="true" />}
              {locked ? "Locked" : "Editable"}
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-7">
            {dates.map((date) => {
              const daySlots = plan.slots.filter((slot) => slot.date === date);
              return (
                <div key={date} className="space-y-3">
                  <h3 className="rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white">
                    {formatDisplayDate(date)}
                  </h3>
                  {daySlots.map((slot) => (
                    <MealSlotCard
                      key={slot.id}
                      planId={plan.id}
                      slot={slot}
                      recipes={recipesForClient}
                      locked={locked}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-md border border-dashed border-ink/20 bg-white p-6">
          <h2 className="text-lg font-semibold">No plan yet</h2>
          <p className="mt-2 text-ink/70">{nextWeek.weekStart} through {nextWeek.weekEnd}</p>
        </section>
      )}
    </div>
  );
}
