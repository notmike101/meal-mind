import { ShoppingListClient } from "@/components/shopping-list-client";
import { isPlanLocked } from "@mealmind/domain";
import { getCurrentShopping, getPlanningState } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const [{ activePlan, nextDraft }, currentShopping] = await Promise.all([
    getPlanningState(),
    getCurrentShopping(),
  ]);
  const plan = activePlan ?? nextDraft;
  const list = currentShopping.shoppingList;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-moss">Shopping</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Consolidated grocery list</h1>
        <p className="mt-2 max-w-3xl text-ink/70">Groceries for the selected meal plan.</p>
      </section>

      {plan ? (
        <ShoppingListClient
          planId={plan.id}
          items={list?.items ?? []}
          canRegenerate={!isPlanLocked(plan)}
        />
      ) : (
        <div className="rounded-md border border-dashed border-ink/20 bg-surface p-6 text-ink/70">
          No meal plan selected.
        </div>
      )}
    </div>
  );
}
