import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShoppingStore } from "./shopping";

describe("shopping store", () => {
  beforeEach(() => setActivePinia(createPinia()));
  afterEach(() => vi.unstubAllGlobals());

  it("loads the list for the explicitly supplied plan", async () => {
    const plan = { id: "selected", weekStart: "2026-07-06", weekEnd: "2026-07-12", status: "draft" as const };
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, data: { id: "list", planId: plan.id, items: [] } });
    vi.stubGlobal("$fetch", fetchMock);

    const store = useShoppingStore();
    await store.fetchForPlan(plan);

    expect(store.plan?.id).toBe("selected");
    expect(store.shoppingList?.planId).toBe("selected");
    expect(fetchMock).toHaveBeenCalledWith("/api/plans/selected/shopping-list", {});
  });

  it("clears a prior list when switching to an empty week", async () => {
    const plan = { id: "selected", weekStart: "2026-07-06", weekEnd: "2026-07-12", status: "draft" as const };
    vi.stubGlobal("$fetch", vi.fn().mockResolvedValueOnce({ ok: true, data: { id: "list", planId: plan.id, items: [] } }));
    const store = useShoppingStore();

    await store.fetchForPlan(plan);
    await store.fetchForPlan(null);

    expect(store.plan).toBeNull();
    expect(store.shoppingList).toBeNull();
  });
});
